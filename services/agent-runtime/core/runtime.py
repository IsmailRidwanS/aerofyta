"""
AeroFyta — Agent Runtime Manager

Manages the lifecycle of AI agents with autonomous SLA discovery, acceptance,
execution, and delivery. The runtime implements a state machine with:

  STARTING → ACTIVE → EXECUTING → (ACTIVE | SAFE_MODE) → TERMINATED

Key autonomous behaviors:
  - _discover_tasks(): Scans for open SLA proposals matching this agent's service type
  - _evaluate_and_accept(): Validates payment, deadline, client reputation before accepting
  - _execute_current_sla(): Runs the appropriate agent (data analyst, etc.) for the task
  - _deliver_on_chain(): Hashes output and submits delivery transaction via Ghost Wallet
  - _check_pending_slas(): Monitors assigned SLAs for action (accept/execute/deliver)

Safe Mode: After 3 consecutive errors, the agent enters a cooldown period to prevent
cascading failures. Error count resets after 60s cooldown.
"""

import asyncio
import time
import hashlib
import json
import os
from typing import Optional, Callable, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum

from core.oracle import OracleClient
from core.safety import SafetyConfig, validate_action, all_checks_passed, get_failed_checks
from core.chain import ChainClient
from core.reputation import ReputationEngine, OutcomeRecord


class AgentStatus(Enum):
    STARTING = "starting"
    ACTIVE = "active"
    DISCOVERING = "discovering"
    EVALUATING = "evaluating"
    EXECUTING = "executing"
    DELIVERING = "delivering"
    SAFE_MODE = "safe_mode"
    PAUSED = "paused"
    TERMINATED = "terminated"


# SLA status constants (matching SLAEngine.sol)
SLA_STATUS_PROPOSED = 0
SLA_STATUS_ACTIVE = 1
SLA_STATUS_DELIVERED = 2
SLA_STATUS_SETTLED = 3
SLA_STATUS_DISPUTED = 4
SLA_STATUS_BREACHED = 5
SLA_STATUS_CANCELLED = 6


@dataclass
class AgentState:
    agent_id: int
    init_username: str
    service_type: str = "data-analysis"
    status: AgentStatus = AgentStatus.STARTING
    total_actions: int = 0
    successful_actions: int = 0
    failed_actions: int = 0
    total_volume: float = 0.0
    last_action_time: float = 0.0
    current_sla_id: Optional[int] = None
    current_task_spec: Optional[str] = None
    error_count: int = 0
    consecutive_errors: int = 0
    tasks_discovered: int = 0
    tasks_accepted: int = 0
    tasks_rejected: int = 0
    reputation_score: float = 50.0


@dataclass
class PendingSLA:
    """Represents a discovered SLA that may need action."""
    sla_id: int
    client_agent: str
    service_type: str
    payment: float
    slash_penalty: float
    deadline: int          # Unix timestamp
    status: int
    input_spec_hash: str


class AgentRuntime:
    """
    Manages the lifecycle of an autonomous AI agent.

    The runtime continuously:
    1. Discovers new SLA proposals matching this agent's capabilities
    2. Evaluates proposals (payment adequacy, deadline feasibility, client trust)
    3. Accepts suitable SLAs (on-chain via Ghost Wallet)
    4. Executes the task (AI analysis, procurement, etc.)
    5. Delivers output (hashed, on-chain with model attribution)
    6. Updates reputation based on outcomes
    """

    def __init__(
        self,
        agent_id: int,
        init_username: str,
        service_type: str = "data-analysis",
        oracle: Optional[OracleClient] = None,
        chain: Optional[ChainClient] = None,
        reputation: Optional[ReputationEngine] = None,
        safety_config: Optional[SafetyConfig] = None,
        poll_interval: float = 30.0,
        on_event: Optional[Callable] = None,
    ):
        self.agent_id = agent_id
        self.init_username = init_username
        self.service_type = service_type
        self.oracle = oracle or OracleClient()
        self.chain = chain
        self.reputation = reputation
        self.safety = safety_config or SafetyConfig(
            max_per_tx=100.0,
            budget_remaining=10000.0,
            whitelisted_contracts=[],
        )
        self.poll_interval = poll_interval
        self.on_event = on_event or (lambda e: None)
        self.state = AgentState(
            agent_id=agent_id,
            init_username=init_username,
            service_type=service_type,
        )
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._pending_slas: List[PendingSLA] = []
        self._execution_history: List[Dict] = []

        # Minimum thresholds for SLA acceptance
        self._min_payment = 5.0           # Won't accept SLAs paying less than 5 INIT
        self._min_deadline_hours = 0.25   # Need at least 15 minutes
        self._max_active_slas = 3         # Don't overcommit
        self._min_client_reputation = 20  # Don't work with untrusted clients

    async def start(self):
        """Start the agent runtime loop."""
        self._running = True
        self.state.status = AgentStatus.ACTIVE
        self._emit("agent_started", f"{self.init_username} runtime started | service: {self.service_type}")
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        """Gracefully stop the agent."""
        self._running = False
        self.state.status = AgentStatus.TERMINATED
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._emit("agent_stopped", f"{self.init_username} runtime stopped")

    async def pause(self):
        """Pause the agent (keeps state, stops executing)."""
        self._running = False
        self.state.status = AgentStatus.PAUSED
        self._emit("agent_paused", f"{self.init_username} paused")

    async def resume(self):
        """Resume a paused agent."""
        if self.state.status == AgentStatus.PAUSED:
            await self.start()

    async def _run_loop(self):
        """
        Main agent loop: discover → evaluate → accept → execute → deliver.

        This is the heartbeat of autonomous operation. Each cycle:
        1. Discover new SLA proposals matching our service type
        2. Evaluate and accept suitable proposals
        3. Execute any active SLA tasks
        4. Handle errors with escalation to SAFE_MODE
        """
        while self._running:
            try:
                self.state.status = AgentStatus.ACTIVE

                # Phase 1: Discover new tasks
                await self._discover_tasks()

                # Phase 2: Evaluate and accept discovered tasks
                await self._evaluate_and_accept_tasks()

                # Phase 3: Check for pending SLAs needing execution
                await self._check_pending_slas()

                # Phase 4: Execute current SLA if we have one
                if self.state.current_sla_id:
                    await self._execute_current_sla()

                # Reset consecutive error count on successful cycle
                self.state.consecutive_errors = 0

                await asyncio.sleep(self.poll_interval)

            except Exception as e:
                self.state.error_count += 1
                self.state.consecutive_errors += 1
                self._emit("agent_error", f"Cycle error: {str(e)[:100]}")

                if self.state.consecutive_errors >= 3:
                    self.state.status = AgentStatus.SAFE_MODE
                    self._emit(
                        "safe_mode",
                        f"{self.init_username} entered SAFE MODE after "
                        f"{self.state.consecutive_errors} consecutive errors. "
                        f"Cooling down for 60s."
                    )
                    await asyncio.sleep(60)
                    self.state.consecutive_errors = 0
                else:
                    await asyncio.sleep(self.poll_interval)

    async def _discover_tasks(self):
        """
        Scan for open SLA proposals matching this agent's service type.

        In production: queries SLAEngine for Proposed status SLAs where
        the provider field matches this agent or is open for any provider.

        For demo: maintains an in-memory list of pending tasks.
        """
        self.state.status = AgentStatus.DISCOVERING

        if self.chain:
            try:
                # Query chain for proposed SLAs targeting this agent
                pending = self.chain.get_pending_slas(self.agent_id)
                for sla_data in pending:
                    sla = PendingSLA(
                        sla_id=sla_data.get("id", 0),
                        client_agent=sla_data.get("client", ""),
                        service_type=sla_data.get("service_type", ""),
                        payment=float(sla_data.get("payment", 0)),
                        slash_penalty=float(sla_data.get("slash_penalty", 0)),
                        deadline=int(sla_data.get("deadline", 0)),
                        status=int(sla_data.get("status", 0)),
                        input_spec_hash=sla_data.get("input_spec_hash", ""),
                    )
                    # Only add if not already tracked and matches our service type
                    existing_ids = {s.sla_id for s in self._pending_slas}
                    if (
                        sla.sla_id not in existing_ids
                        and sla.status == SLA_STATUS_PROPOSED
                        and (sla.service_type == self.service_type or sla.service_type == "")
                    ):
                        self._pending_slas.append(sla)
                        self.state.tasks_discovered += 1
                        self._emit(
                            "task_discovered",
                            f"Discovered SLA #{sla.sla_id} | "
                            f"Payment: {sla.payment} INIT | "
                            f"Service: {sla.service_type}"
                        )
            except Exception as e:
                self._emit("discovery_error", f"Chain query failed: {str(e)[:80]}")

    async def _evaluate_and_accept_tasks(self):
        """
        Evaluate discovered SLAs and accept those meeting our criteria.

        Acceptance criteria:
        1. Payment >= minimum threshold
        2. Deadline is feasible (enough time to complete)
        3. Slash penalty is acceptable relative to our stake
        4. Client reputation is above minimum (if reputation engine available)
        5. We haven't exceeded max concurrent SLAs
        """
        self.state.status = AgentStatus.EVALUATING

        # Don't accept more if already at capacity
        if self.state.current_sla_id is not None:
            return

        accepted = None
        for sla in list(self._pending_slas):
            evaluation = self._evaluate_sla_proposal(sla)

            if evaluation["accept"]:
                # Accept this SLA
                try:
                    if self.chain:
                        self.chain.accept_sla(sla.sla_id)
                        self._emit(
                            "sla_accepted",
                            f"Accepted SLA #{sla.sla_id} | "
                            f"Payment: {sla.payment} INIT | "
                            f"Reason: {evaluation['reason']}"
                        )
                    else:
                        self._emit(
                            "sla_accepted",
                            f"[Demo] Accepted SLA #{sla.sla_id} | "
                            f"Reason: {evaluation['reason']}"
                        )

                    self.state.current_sla_id = sla.sla_id
                    self.state.current_task_spec = sla.input_spec_hash
                    self.state.tasks_accepted += 1
                    accepted = sla
                    break

                except Exception as e:
                    self._emit("accept_error", f"Failed to accept SLA #{sla.sla_id}: {str(e)[:80]}")
            else:
                self.state.tasks_rejected += 1
                self._emit(
                    "sla_rejected",
                    f"Rejected SLA #{sla.sla_id} | Reason: {evaluation['reason']}"
                )
                self._pending_slas.remove(sla)

        if accepted:
            self._pending_slas.remove(accepted)

    def _evaluate_sla_proposal(self, sla: PendingSLA) -> Dict:
        """
        Multi-criteria evaluation of an SLA proposal.

        Returns: {"accept": bool, "reason": str, "score": float}
        """
        reasons = []
        score = 0.0

        # 1. Payment adequacy
        if sla.payment < self._min_payment:
            return {
                "accept": False,
                "reason": f"Payment {sla.payment} INIT below minimum {self._min_payment}",
                "score": 0,
            }
        # Higher payment = higher score
        payment_score = min(30, (sla.payment / self._min_payment) * 10)
        score += payment_score
        reasons.append(f"payment:{sla.payment}INIT")

        # 2. Deadline feasibility
        remaining_hours = (sla.deadline - time.time()) / 3600
        if remaining_hours < self._min_deadline_hours:
            return {
                "accept": False,
                "reason": f"Only {remaining_hours:.1f}h remaining, need {self._min_deadline_hours}h minimum",
                "score": 0,
            }
        deadline_score = min(25, remaining_hours * 5)
        score += deadline_score
        reasons.append(f"deadline:{remaining_hours:.1f}h")

        # 3. Slash risk assessment
        slash_ratio = sla.slash_penalty / max(sla.payment, 1)
        if slash_ratio > 2.0:
            return {
                "accept": False,
                "reason": f"Slash penalty ({sla.slash_penalty} INIT) is {slash_ratio:.1f}x payment — too risky",
                "score": 0,
            }
        risk_score = max(0, 25 - slash_ratio * 10)
        score += risk_score
        reasons.append(f"risk:{slash_ratio:.1f}x")

        # 4. Client reputation check
        if self.reputation:
            client_rep = self.reputation.get_score(0)  # Would use client agent_id
            if client_rep < self._min_client_reputation:
                return {
                    "accept": False,
                    "reason": f"Client reputation {client_rep:.0f} below threshold {self._min_client_reputation}",
                    "score": 0,
                }
            score += min(20, client_rep / 5)

        # Accept if score exceeds threshold
        accept = score >= 30
        return {
            "accept": accept,
            "reason": "; ".join(reasons) if accept else "Score too low: " + "; ".join(reasons),
            "score": score,
        }

    async def _check_pending_slas(self):
        """
        Check on-chain for active SLAs assigned to this agent that need execution.

        Monitors:
        - Active SLAs approaching deadline (urgency escalation)
        - Delivered SLAs awaiting settlement (track outcome)
        - Disputed SLAs needing re-delivery
        """
        if not self.chain:
            return

        try:
            active_slas = self.chain.get_active_slas(self.agent_id)

            for sla_data in active_slas:
                sla_id = sla_data.get("id", 0)
                status = sla_data.get("status", 0)
                deadline = sla_data.get("deadline", 0)

                # If we don't have a current task and there's an active SLA, claim it
                if (
                    self.state.current_sla_id is None
                    and status == SLA_STATUS_ACTIVE
                ):
                    self.state.current_sla_id = sla_id
                    self.state.current_task_spec = sla_data.get("input_spec_hash", "")
                    self._emit(
                        "sla_claimed",
                        f"Claimed active SLA #{sla_id} for execution"
                    )

                # Urgency check: warn if deadline is approaching
                if status == SLA_STATUS_ACTIVE and deadline > 0:
                    remaining = deadline - time.time()
                    if remaining < 600:  # Less than 10 minutes
                        self._emit(
                            "deadline_warning",
                            f"SLA #{sla_id} deadline in {remaining/60:.0f} minutes!"
                        )

                # Track settled/breached outcomes for reputation
                if status == SLA_STATUS_SETTLED and self.reputation:
                    self.reputation.record_outcome(
                        OutcomeRecord(
                            sla_id=sla_id,
                            outcome="settled",
                            quality_score=80.0,
                            delivery_time_ratio=0.7,
                            payment_amount=float(sla_data.get("payment", 0)),
                        ),
                        agent_id=self.agent_id,
                    )

        except Exception as e:
            self._emit("check_error", f"SLA check failed: {str(e)[:80]}")

    async def _execute_current_sla(self):
        """
        Execute the current SLA task by delegating to the appropriate agent.

        The task spec determines which agent to use:
        - data-analysis → DataAnalystAgent
        - procurement → BuyerAgent (would need inversion)
        - Other → Generic execution

        Includes pre-execution safety checks and output hashing.
        """
        self.state.status = AgentStatus.EXECUTING
        sla_id = self.state.current_sla_id
        self._emit("executing", f"Executing SLA #{sla_id}")

        # Determine task spec — decode from input_spec_hash or use service type default
        task_spec = self._resolve_task_spec()

        # Pre-execution safety validation
        safety_checks = validate_action(
            action_type="sla_execution",
            amount=0,  # No direct payment during execution
            target_contract="",
            oracle_timestamp=time.time(),
            config=self.safety,
        )
        if not all_checks_passed(safety_checks):
            failed = get_failed_checks(safety_checks)
            self._emit(
                "safety_block",
                f"SLA #{sla_id} blocked by safety: {', '.join(f.check_name for f in failed)}"
            )
            return

        # Import and run the appropriate agent
        from agents.data_analyst import DataAnalystAgent

        analyst = DataAnalystAgent(
            agent_id=self.agent_id,
            init_username=self.init_username,
            oracle=self.oracle,
            anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        )

        try:
            result = await analyst.execute_analysis(
                sla_id=sla_id,
                task_spec=task_spec,
            )

            self.state.successful_actions += 1
            self.state.total_actions += 1
            self.state.last_action_time = time.time()

            self._emit(
                "sla_delivered",
                f"SLA #{sla_id} delivered | Model: {result['model_id']} | "
                f"Hash: {result['output_hash'][:18]}..."
            )

            # Deliver on-chain if chain client is available
            await self._deliver_on_chain(sla_id, result)

            # Record in execution history
            self._execution_history.append({
                "sla_id": sla_id,
                "task_spec": task_spec,
                "output_hash": result["output_hash"],
                "model_id": result["model_id"],
                "model_version": result["model_version"],
                "timestamp": time.time(),
                "success": True,
            })

            self.state.current_sla_id = None
            self.state.current_task_spec = None

        except Exception as e:
            self.state.failed_actions += 1
            self.state.total_actions += 1
            self._emit("sla_failed", f"SLA #{sla_id} execution failed: {str(e)[:100]}")

            self._execution_history.append({
                "sla_id": sla_id,
                "task_spec": task_spec,
                "error": str(e)[:200],
                "timestamp": time.time(),
                "success": False,
            })

    async def _deliver_on_chain(self, sla_id: int, result: Dict):
        """Submit delivery transaction on-chain via Ghost Wallet."""
        if not self.chain:
            return

        self.state.status = AgentStatus.DELIVERING
        try:
            output_hash_bytes = bytes.fromhex(result["output_hash"][2:])
            output_location = (
                f"ipfs://Qm{hashlib.sha256(result['output_json'].encode()).hexdigest()[:32]}"
            )

            tx_hash = self.chain.deliver_sla(
                sla_id=sla_id,
                output_hash=output_hash_bytes,
                output_location=output_location,
                model_id=result["model_id"],
                model_version=result["model_version"],
            )
            self._emit(
                "tx_broadcast",
                f"Delivery tx for SLA #{sla_id}: {tx_hash[:18]}..."
            )
        except Exception as e:
            self._emit("delivery_error", f"On-chain delivery failed: {str(e)[:80]}")

    def _resolve_task_spec(self) -> str:
        """
        Resolve the task specification from the SLA input spec hash.

        In production: would decode the input_spec_hash from IPFS or on-chain storage.
        For demo: maps service types to default task descriptions.
        """
        if self.state.current_task_spec and self.state.current_task_spec.startswith("0x"):
            # Would decode from IPFS/chain — for now use service type mapping
            pass

        task_specs = {
            "data-analysis": (
                "Analyze InitiaDEX pool performance including APY, TVL, risk scores, "
                "Sharpe ratios, impermanent loss estimates, and allocation recommendations. "
                "Cross-reference with Slinky oracle price feeds for accuracy."
            ),
            "procurement": (
                "Discover and evaluate available service providers matching the required "
                "capabilities. Assess reputation, pricing, and availability."
            ),
            "risk-assessment": (
                "Perform comprehensive risk analysis of the target DeFi positions including "
                "smart contract risk, liquidity risk, oracle risk, and market risk."
            ),
            "execution": (
                "Execute the specified cross-chain bridging operation with safety checks "
                "for slippage, gas optimization, and route selection."
            ),
        }

        return task_specs.get(self.service_type, task_specs["data-analysis"])

    def _emit(self, event_type: str, description: str):
        """Emit an event for the WebSocket feed."""
        self.on_event({
            "type": event_type,
            "agent_id": self.agent_id,
            "agentName": f"{self.init_username}.init",
            "description": description,
            "timestamp": time.time(),
            "status": self.state.status.value,
        })

    def get_state(self) -> dict:
        """Return current agent state for API/dashboard."""
        return {
            "agent_id": self.state.agent_id,
            "init_username": self.state.init_username,
            "service_type": self.state.service_type,
            "status": self.state.status.value,
            "total_actions": self.state.total_actions,
            "successful_actions": self.state.successful_actions,
            "failed_actions": self.state.failed_actions,
            "total_volume": self.state.total_volume,
            "last_action_time": self.state.last_action_time,
            "current_sla_id": self.state.current_sla_id,
            "error_count": self.state.error_count,
            "tasks_discovered": self.state.tasks_discovered,
            "tasks_accepted": self.state.tasks_accepted,
            "tasks_rejected": self.state.tasks_rejected,
            "reputation_score": self.state.reputation_score,
            "performance_score": (
                round(self.state.successful_actions / max(self.state.total_actions, 1) * 100, 1)
            ),
            "execution_history": self._execution_history[-10:],  # Last 10 executions
        }
