"""
AeroFyta — Autonomous Buyer Agent

An intelligent procurement agent that autonomously discovers providers,
creates SLAs, monitors deliveries, evaluates quality, and settles or
disputes based on objective criteria.

Autonomous Procurement Cycle:
  1. Identify need (from task queue or external trigger)
  2. Discover and rank providers via matching engine
  3. Select best provider considering reputation, price, risk
  4. Create SLA with calibrated parameters
  5. Monitor delivery progress
  6. Evaluate output quality against oracle ground truth
  7. Settle or dispute with evidence
  8. Update provider reputation

The buyer is the demand side of the AeroFyta agent marketplace.
"""

import time
import hashlib
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

from core.reputation import ReputationEngine, OutcomeRecord
from core.matching import (
    MatchingEngine, TaskSpec, ProviderCandidate, ProviderMatch, RiskTolerance
)
from core.evaluator import QualityEvaluator, Recommendation
from core.oracle import OracleClient
from core.chain import ChainClient

logger = logging.getLogger("aerofyta.buyer")


@dataclass
class ProcurementTask:
    """A task that needs to be procured from the marketplace."""
    task_id: str
    service_type: str
    description: str
    budget: float
    deadline_hours: float
    quality_threshold: float = 60.0
    risk_tolerance: str = "balanced"
    priority: str = "normal"  # low, normal, high, critical
    created_at: float = field(default_factory=time.time)

    @property
    def input_spec(self) -> Dict:
        """Generate the input specification for the SLA."""
        return {
            "task_id": self.task_id,
            "service_type": self.service_type,
            "description": self.description,
            "quality_threshold": self.quality_threshold,
            "created_at": self.created_at,
        }

    @property
    def input_spec_hash(self) -> str:
        """SHA256 hash of the input specification."""
        spec_json = json.dumps(self.input_spec, sort_keys=True)
        return "0x" + hashlib.sha256(spec_json.encode()).hexdigest()


@dataclass
class ProcurementResult:
    """Result of a procurement cycle."""
    task_id: str
    success: bool
    sla_id: Optional[int] = None
    provider: Optional[str] = None
    quality_score: Optional[float] = None
    recommendation: Optional[str] = None
    cost: Optional[float] = None
    delivery_time_hours: Optional[float] = None
    evidence: List[str] = field(default_factory=list)
    error: Optional[str] = None


class BuyerAgent:
    """
    Autonomous procurement agent that manages the full lifecycle of
    acquiring AI services from the AeroFyta marketplace.

    Usage:
        buyer = BuyerAgent(
            agent_id=2,
            init_username="globex-buyer",
            reputation=reputation_engine,
            oracle=oracle_client,
            chain=chain_client,
        )

        # Full autonomous cycle
        result = await buyer.autonomous_procurement_cycle(
            ProcurementTask(
                task_id="task_001",
                service_type="data-analysis",
                description="Analyze InitiaDEX pool performance",
                budget=30.0,
                deadline_hours=1.0,
            )
        )
    """

    def __init__(
        self,
        agent_id: int,
        init_username: str,
        reputation: Optional[ReputationEngine] = None,
        oracle: Optional[OracleClient] = None,
        chain: Optional[ChainClient] = None,
    ):
        self.agent_id = agent_id
        self.init_username = init_username
        self.reputation = reputation or ReputationEngine()
        self.oracle = oracle or OracleClient()
        self.chain = chain
        self.matching = MatchingEngine(self.reputation)
        self.evaluator = QualityEvaluator()
        self._procurement_history: List[ProcurementResult] = []

    async def autonomous_procurement_cycle(
        self, task: ProcurementTask
    ) -> ProcurementResult:
        """
        Execute a complete autonomous procurement cycle.

        This is the core method that demonstrates autonomous agent behavior:
        discover -> match -> create SLA -> monitor -> evaluate -> settle/dispute.
        """
        logger.info(f"[BuyerAgent] Starting procurement for task '{task.task_id}'")

        try:
            # Step 1: Discover and rank providers
            providers = await self.discover_providers(task)
            if not providers:
                return self._fail_result(task, "No providers found matching criteria")

            # Step 2: Select the best provider
            best_match = self._select_provider(providers, task)
            if not best_match:
                return self._fail_result(task, "No provider met acceptance criteria")

            logger.info(
                f"[BuyerAgent] Selected provider: {best_match.init_username}.init "
                f"(score: {best_match.match_score:.1f}, confidence: {best_match.match_confidence:.0%})"
            )

            # Step 3: Calibrate SLA parameters
            sla_params = self._calibrate_sla_params(task, best_match)

            # Step 4: Create SLA (on-chain if available)
            sla_id = await self.create_sla(task, best_match, sla_params)

            # Step 5: Wait for delivery (simulated in demo)
            delivery = await self._await_delivery(sla_id, task)

            # Step 6: Evaluate delivery quality
            evaluation = await self.evaluate_delivery(sla_id, delivery, task)

            # Step 7: Act on evaluation
            if evaluation.recommendation in (Recommendation.SETTLE, Recommendation.FLAG):
                await self.settle_sla(sla_id, evaluation)
                self._update_reputation(best_match.agent_id, sla_id, "settled", evaluation)
                result = ProcurementResult(
                    task_id=task.task_id,
                    success=True,
                    sla_id=sla_id,
                    provider=f"{best_match.init_username}.init",
                    quality_score=evaluation.overall_score,
                    recommendation="settled",
                    cost=sla_params["payment"],
                    delivery_time_hours=sla_params.get("est_delivery_hours", 0),
                    evidence=evaluation.evidence,
                )
            else:
                await self.dispute_sla(sla_id, evaluation)
                self._update_reputation(best_match.agent_id, sla_id, "disputed", evaluation)
                result = ProcurementResult(
                    task_id=task.task_id,
                    success=False,
                    sla_id=sla_id,
                    provider=f"{best_match.init_username}.init",
                    quality_score=evaluation.overall_score,
                    recommendation="disputed",
                    evidence=evaluation.evidence,
                )

            self._procurement_history.append(result)
            return result

        except Exception as e:
            logger.error(f"[BuyerAgent] Procurement failed: {e}")
            result = self._fail_result(task, str(e))
            self._procurement_history.append(result)
            return result

    async def discover_providers(self, task: ProcurementTask) -> List[ProviderMatch]:
        """
        Discover and rank available providers for a task.
        Uses the MatchingEngine with reputation + pricing + availability scoring.
        """
        candidates = await self._get_provider_candidates(task.service_type)
        if not candidates:
            return []

        task_spec = TaskSpec(
            service_type=task.service_type,
            description=task.description,
            budget=task.budget,
            deadline_hours=task.deadline_hours,
            quality_threshold=task.quality_threshold,
        )

        risk = RiskTolerance(task.risk_tolerance)
        matches = self.matching.match_providers(task_spec, candidates, risk)

        logger.info(f"[BuyerAgent] Found {len(matches)} matching providers")
        return matches

    async def create_sla(
        self, task: ProcurementTask, provider: ProviderMatch, params: Dict,
    ) -> int:
        """Create an SLA on-chain with the selected provider."""
        sla_id = int(time.time()) % 10000

        if self.chain:
            try:
                tx_hash = self.chain.create_sla(
                    provider_agent_id=provider.agent_id,
                    service_type=task.service_type,
                    payment=params["payment"],
                    slash_penalty=params["slash_penalty"],
                    deadline_seconds=int(params["deadline_hours"] * 3600),
                    input_spec_hash=task.input_spec_hash,
                )
                logger.info(f"[BuyerAgent] Created SLA on-chain, tx: {tx_hash[:18]}...")
            except Exception as e:
                logger.warning(f"[BuyerAgent] Chain SLA creation failed: {e}")

        return sla_id

    async def evaluate_delivery(
        self, sla_id: int, delivery: Dict, task: ProcurementTask,
    ):
        """Evaluate delivery using QualityEvaluator with oracle cross-reference."""
        oracle_data = None
        try:
            prices = await self.oracle.get_oracle_prices()
            pools = await self.oracle.get_dex_pools()
            oracle_data = {"prices": prices, "pools": pools}
        except Exception:
            pass

        sla_spec = {
            "service_type": task.service_type,
            "deadline_hours": task.deadline_hours,
        }

        return self.evaluator.evaluate(
            sla_id=sla_id,
            delivery=delivery,
            sla_spec=sla_spec,
            oracle_data=oracle_data,
            delivery_timestamp=time.time(),
            creation_timestamp=task.created_at,
        )

    async def settle_sla(self, sla_id: int, evaluation):
        """Settle an SLA — confirm quality and release payment."""
        if self.chain:
            try:
                self.chain.settle_sla(sla_id)
            except Exception as e:
                logger.warning(f"[BuyerAgent] Settlement failed: {e}")
        logger.info(f"[BuyerAgent] Settled SLA #{sla_id} | Score: {evaluation.overall_score:.0f}/100")

    async def dispute_sla(self, sla_id: int, evaluation):
        """Dispute an SLA — quality below threshold."""
        if self.chain:
            try:
                self.chain.dispute_sla(sla_id)
            except Exception as e:
                logger.warning(f"[BuyerAgent] Dispute failed: {e}")
        logger.info(f"[BuyerAgent] Disputed SLA #{sla_id} | Score: {evaluation.overall_score:.0f}/100")

    # ─── Private Helpers ───────────────────────────────────────────

    def _select_provider(self, matches: List[ProviderMatch], task: ProcurementTask) -> Optional[ProviderMatch]:
        """Select best provider with confidence/risk/budget filters."""
        for match in matches:
            if match.match_confidence < 0.3:
                continue
            if match.risk_score > 80:
                continue
            if match.price_estimate > task.budget:
                continue
            return match
        return None

    def _calibrate_sla_params(self, task: ProcurementTask, provider: ProviderMatch) -> Dict:
        """Dynamically calibrate SLA parameters based on task + provider profile."""
        payment = min(provider.price_estimate * 1.1, task.budget)
        priority_multipliers = {"low": 0.3, "normal": 0.5, "high": 0.7, "critical": 1.0}
        slash_penalty = payment * priority_multipliers.get(task.priority, 0.5)
        deadline_hours = min(provider.estimated_delivery_hours * 1.2, task.deadline_hours)

        return {
            "payment": round(payment, 2),
            "slash_penalty": round(slash_penalty, 2),
            "deadline_hours": round(deadline_hours, 2),
            "est_delivery_hours": round(provider.estimated_delivery_hours, 2),
        }

    def _estimate_fair_price(self, service_type: str, complexity: str) -> float:
        """Estimate fair price from historical procurement data."""
        historical = [r.cost for r in self._procurement_history if r.success and r.cost]
        base = sum(historical) / len(historical) if historical else {"low": 10, "medium": 25, "high": 75}.get(complexity, 25)
        premiums = {"data-analysis": 1.0, "risk-assessment": 1.3, "procurement": 0.8, "execution": 1.5}
        return round(base * premiums.get(service_type, 1.0), 2)

    def _update_reputation(self, provider_id, sla_id, outcome, evaluation):
        """Update provider reputation based on outcome."""
        if not self.reputation:
            return
        self.reputation.record_outcome(
            OutcomeRecord(
                sla_id=sla_id, outcome=outcome,
                quality_score=evaluation.overall_score if evaluation else 50.0,
                delivery_time_ratio=0.7, payment_amount=30.0,
            ),
            agent_id=provider_id,
        )

    async def _get_provider_candidates(self, service_type: str) -> List[ProviderCandidate]:
        """Get candidates from chain or demo data."""
        if self.chain:
            try:
                agents = self.chain.get_agents_by_service_type(service_type)
                return [
                    ProviderCandidate(
                        agent_id=a["id"], init_username=a["username"],
                        service_type=a["service_type"], stake=float(a.get("stake", 0)),
                        active_slas=int(a.get("active_slas", 0)),
                        earnings=float(a.get("earnings", 0)), is_active=a.get("is_active", True),
                    )
                    for a in agents
                ]
            except Exception:
                pass
        from core.matching import create_demo_candidates
        return create_demo_candidates()

    async def _await_delivery(self, sla_id: int, task: ProcurementTask) -> Dict:
        """Wait for delivery (simulated in demo mode)."""
        return {
            "pool_rankings": [
                {"pool": "INIT/USDC", "apy": 14.2, "tvl": 45000, "risk_score": 72, "sharpe_ratio": 1.8, "il_estimate": "2.1%", "allocation_pct": 35, "confidence": 88},
                {"pool": "INIT/ETH", "apy": 18.1, "tvl": 12000, "risk_score": 58, "sharpe_ratio": 1.4, "il_estimate": "4.7%", "allocation_pct": 25, "confidence": 74},
                {"pool": "milkINIT", "apy": 22.3, "tvl": 890000, "risk_score": 85, "sharpe_ratio": 2.1, "il_estimate": "0%", "allocation_pct": 40, "confidence": 82},
            ],
            "risk_warnings": [
                "INIT/ETH pool TVL is $12K — high concentration risk above 20% allocation",
                "INIT/ETH has elevated impermanent loss (4.7%) due to ETH volatility",
            ],
            "summary": "Recommend 3-pool diversified allocation targeting 18.5% blended APY.",
            "blended_apy": 18.5,
            "model_id": "claude-sonnet-4",
            "model_version": "20250514",
            "data_timestamp": time.time() - 120,
            "total_data_points": 42,
        }

    @staticmethod
    def _fail_result(task: ProcurementTask, error: str) -> ProcurementResult:
        return ProcurementResult(task_id=task.task_id, success=False, error=error)

    def get_history(self) -> List[Dict]:
        """Return procurement history for API."""
        return [
            {"task_id": r.task_id, "success": r.success, "sla_id": r.sla_id,
             "provider": r.provider, "quality_score": r.quality_score,
             "recommendation": r.recommendation, "cost": r.cost, "error": r.error}
            for r in self._procurement_history
        ]
