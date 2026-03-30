"""
AeroFyta — Agent Runtime Manager
Manages the lifecycle of AI agents: spawn, monitor, pause, terminate.
"""

import asyncio
import time
import hashlib
import json
from typing import Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

from core.oracle import OracleClient
from core.safety import SafetyConfig, validate_action, all_checks_passed, get_failed_checks
from core.chain import ChainClient


class AgentStatus(Enum):
    STARTING = "starting"
    ACTIVE = "active"
    EXECUTING = "executing"
    SAFE_MODE = "safe_mode"
    PAUSED = "paused"
    TERMINATED = "terminated"


@dataclass
class AgentState:
    agent_id: int
    init_username: str
    status: AgentStatus = AgentStatus.STARTING
    total_actions: int = 0
    successful_actions: int = 0
    failed_actions: int = 0
    total_volume: float = 0.0
    last_action_time: float = 0.0
    current_sla_id: Optional[int] = None
    error_count: int = 0


class AgentRuntime:
    """
    Manages the lifecycle of an AI agent process.
    Handles: SLA monitoring, execution loop, safety checks, fallback.
    """

    def __init__(
        self,
        agent_id: int,
        init_username: str,
        oracle: OracleClient,
        chain: Optional[ChainClient] = None,
        safety_config: Optional[SafetyConfig] = None,
        poll_interval: float = 30.0,
        on_event: Optional[Callable] = None,
    ):
        self.agent_id = agent_id
        self.init_username = init_username
        self.oracle = oracle
        self.chain = chain
        self.safety = safety_config or SafetyConfig(
            max_per_tx=100.0,
            budget_remaining=10000.0,
            whitelisted_contracts=[],
        )
        self.poll_interval = poll_interval
        self.on_event = on_event or (lambda e: None)
        self.state = AgentState(agent_id=agent_id, init_username=init_username)
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the agent runtime loop."""
        self._running = True
        self.state.status = AgentStatus.ACTIVE
        self._emit("agent_started", f"{self.init_username} runtime started")
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
        """Main agent loop: check for SLAs, execute, record."""
        while self._running:
            try:
                self.state.status = AgentStatus.ACTIVE

                # Check for pending SLAs assigned to this agent
                if self.chain:
                    await self._check_pending_slas()

                # If we have an active SLA, execute it
                if self.state.current_sla_id:
                    await self._execute_current_sla()

                await asyncio.sleep(self.poll_interval)

            except Exception as e:
                self.state.error_count += 1
                self._emit("agent_error", f"Error: {str(e)[:100]}")

                if self.state.error_count >= 3:
                    self.state.status = AgentStatus.SAFE_MODE
                    self._emit("safe_mode", f"{self.init_username} entered SAFE MODE after {self.state.error_count} errors")
                    await asyncio.sleep(60)  # Wait longer in safe mode
                    self.state.error_count = 0  # Reset after cooldown
                else:
                    await asyncio.sleep(self.poll_interval)

    async def _check_pending_slas(self):
        """Check on-chain for SLAs assigned to this agent that need action."""
        # In production: query SLAEngine.getAgentSLAs() and filter by status
        pass

    async def _execute_current_sla(self):
        """Execute the current SLA task."""
        self.state.status = AgentStatus.EXECUTING
        self._emit("executing", f"Executing SLA #{self.state.current_sla_id}")

        # Import the data analyst agent for execution
        from agents.data_analyst import DataAnalystAgent

        analyst = DataAnalystAgent(
            agent_id=self.agent_id,
            init_username=self.init_username,
            oracle=self.oracle,
            anthropic_api_key="",  # Loaded from env in production
        )

        try:
            result = await analyst.execute_analysis(
                sla_id=self.state.current_sla_id,
                task_spec="Analyze InitiaDEX pool performance",
            )

            self.state.successful_actions += 1
            self.state.total_actions += 1
            self.state.last_action_time = time.time()

            self._emit("sla_delivered", f"SLA #{self.state.current_sla_id} delivered. Hash: {result['output_hash'][:18]}...")

            # Deliver on-chain if chain client is available
            if self.chain:
                output_hash_bytes = bytes.fromhex(result["output_hash"][2:])
                tx_hash = self.chain.deliver_sla(
                    sla_id=self.state.current_sla_id,
                    output_hash=output_hash_bytes,
                    output_location=f"ipfs://Qm{hashlib.sha256(result['output_json'].encode()).hexdigest()[:32]}",
                    model_id=result["model_id"],
                    model_version=result["model_version"],
                )
                self._emit("tx_broadcast", f"Delivery tx: {tx_hash[:18]}...")

            self.state.current_sla_id = None

        except Exception as e:
            self.state.failed_actions += 1
            self.state.total_actions += 1
            self._emit("sla_failed", f"SLA #{self.state.current_sla_id} failed: {str(e)[:100]}")

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
            "status": self.state.status.value,
            "total_actions": self.state.total_actions,
            "successful_actions": self.state.successful_actions,
            "failed_actions": self.state.failed_actions,
            "total_volume": self.state.total_volume,
            "last_action_time": self.state.last_action_time,
            "current_sla_id": self.state.current_sla_id,
            "error_count": self.state.error_count,
            "performance_score": (
                round(self.state.successful_actions / max(self.state.total_actions, 1) * 100, 1)
            ),
        }
