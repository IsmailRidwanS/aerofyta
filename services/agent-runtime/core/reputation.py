"""
AeroFyta Reputation Engine — EMA-Based Agent Reputation Scoring

Implements an Exponential Moving Average (EMA) reputation system that provides
real-time, adaptive reputation scores for AI agents. Recent performance is weighted
more heavily, enabling the protocol to quickly identify degrading or improving agents.

Scoring Dimensions:
  - Success Rate (weight 0.35): settled / total SLAs
  - Time Reliability (weight 0.25): how close to deadline deliveries are made
  - Quality Score (weight 0.25): evaluator-assessed output quality
  - Consistency (weight 0.15): low variance in recent performance

Mathematical Foundation:
  EMA = α × latest_score + (1 - α) × previous_ema
  where α = 0.3 (higher = more responsive to recent performance)
"""

import json
import time
import math
import os
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from enum import Enum


class SLAOutcome(Enum):
    """Possible SLA resolution outcomes."""
    SETTLED = "settled"
    BREACHED = "breached"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"


@dataclass
class OutcomeRecord:
    """Record of a single SLA outcome for an agent."""
    sla_id: int
    outcome: str
    quality_score: float          # 0-100, from QualityEvaluator
    delivery_time_ratio: float    # actual_time / allowed_time (lower is better)
    payment_amount: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class AgentReputation:
    """Full reputation profile for an agent."""
    agent_id: int
    init_username: str
    service_type: str

    # Aggregate stats
    total_slas: int = 0
    settled_count: int = 0
    breached_count: int = 0
    disputed_count: int = 0
    cancelled_count: int = 0

    # EMA scores (0-100)
    ema_score: float = 50.0  # Start neutral
    success_rate_score: float = 50.0
    time_reliability_score: float = 50.0
    quality_ema: float = 50.0
    consistency_score: float = 50.0

    # Raw metrics
    total_volume: float = 0.0            # Total INIT processed
    avg_delivery_time_ratio: float = 0.5  # Average delivery time / deadline
    recent_quality_scores: List[float] = field(default_factory=list)
    recent_outcomes: List[str] = field(default_factory=list)

    # Metadata
    registered_at: float = field(default_factory=time.time)
    last_updated: float = field(default_factory=time.time)

    @property
    def breach_rate(self) -> float:
        """Percentage of SLAs that resulted in breach."""
        return (self.breached_count / max(self.total_slas, 1)) * 100

    @property
    def success_rate(self) -> float:
        """Percentage of SLAs successfully settled."""
        return (self.settled_count / max(self.total_slas, 1)) * 100

    @property
    def quality_volatility(self) -> float:
        """Standard deviation of recent quality scores — measures consistency."""
        if len(self.recent_quality_scores) < 2:
            return 0.0
        mean = sum(self.recent_quality_scores) / len(self.recent_quality_scores)
        variance = sum((s - mean) ** 2 for s in self.recent_quality_scores) / len(self.recent_quality_scores)
        return math.sqrt(variance)


# Scoring weights
DIMENSION_WEIGHTS = {
    "success_rate": 0.35,
    "time_reliability": 0.25,
    "quality": 0.25,
    "consistency": 0.15,
}

# EMA smoothing factor — higher = more responsive to recent performance
EMA_ALPHA = 0.3

# Maximum recent records to keep for volatility calculation
MAX_RECENT_RECORDS = 20

# Reputation tiers
REPUTATION_TIERS = {
    (90, 100): {"tier": "Elite", "color": "#4ade80", "description": "Top-tier agent with exceptional track record"},
    (70, 89):  {"tier": "Trusted", "color": "#60a5fa", "description": "Reliable agent with strong performance"},
    (50, 69):  {"tier": "Standard", "color": "#fbbf24", "description": "Average performance, moderate trust"},
    (30, 49):  {"tier": "Probation", "color": "#fb923c", "description": "Below average, elevated risk"},
    (0, 29):   {"tier": "Restricted", "color": "#f87171", "description": "Poor track record, high risk"},
}


class ReputationEngine:
    """
    EMA-based reputation scoring engine for AI agents.

    The engine maintains rolling reputation scores that adapt to recent
    performance. This enables autonomous agents to make trust-informed
    decisions about which providers to engage.

    Usage:
        engine = ReputationEngine()
        engine.register_agent(1, "acme-analyst", "data-analysis")

        # After SLA settlement
        engine.record_outcome(OutcomeRecord(
            sla_id=1, outcome="settled",
            quality_score=85.0, delivery_time_ratio=0.7,
            payment_amount=30.0
        ), agent_id=1)

        score = engine.get_score(1)
        profile = engine.get_risk_profile(1)
        ranked = engine.rank_providers([1, 2, 3])
    """

    def __init__(self, persistence_path: Optional[str] = None):
        self._agents: Dict[int, AgentReputation] = {}
        self._outcome_history: Dict[int, List[OutcomeRecord]] = {}
        self._persistence_path = persistence_path or os.path.join(
            os.path.dirname(__file__), "..", "data", "reputation.json"
        )
        self._load_persisted()

    def register_agent(
        self, agent_id: int, init_username: str, service_type: str
    ) -> AgentReputation:
        """Register a new agent in the reputation system."""
        if agent_id in self._agents:
            return self._agents[agent_id]

        rep = AgentReputation(
            agent_id=agent_id,
            init_username=init_username,
            service_type=service_type,
        )
        self._agents[agent_id] = rep
        self._outcome_history[agent_id] = []
        self._persist()
        return rep

    def record_outcome(self, outcome: OutcomeRecord, agent_id: int) -> float:
        """
        Record an SLA outcome and update the agent's reputation.

        Returns the new EMA reputation score.
        """
        if agent_id not in self._agents:
            raise ValueError(f"Agent {agent_id} not registered in reputation system")

        rep = self._agents[agent_id]

        # Store outcome record
        if agent_id not in self._outcome_history:
            self._outcome_history[agent_id] = []
        self._outcome_history[agent_id].append(outcome)

        # Update aggregate counts
        rep.total_slas += 1
        rep.total_volume += outcome.payment_amount

        if outcome.outcome == SLAOutcome.SETTLED.value:
            rep.settled_count += 1
        elif outcome.outcome == SLAOutcome.BREACHED.value:
            rep.breached_count += 1
        elif outcome.outcome == SLAOutcome.DISPUTED.value:
            rep.disputed_count += 1
        elif outcome.outcome == SLAOutcome.CANCELLED.value:
            rep.cancelled_count += 1

        # Update recent tracking
        rep.recent_quality_scores.append(outcome.quality_score)
        if len(rep.recent_quality_scores) > MAX_RECENT_RECORDS:
            rep.recent_quality_scores = rep.recent_quality_scores[-MAX_RECENT_RECORDS:]

        rep.recent_outcomes.append(outcome.outcome)
        if len(rep.recent_outcomes) > MAX_RECENT_RECORDS:
            rep.recent_outcomes = rep.recent_outcomes[-MAX_RECENT_RECORDS:]

        # Compute per-dimension scores
        rep.success_rate_score = self._compute_success_score(rep)
        rep.time_reliability_score = self._compute_time_score(rep, outcome)
        rep.quality_ema = self._ema_update(rep.quality_ema, outcome.quality_score)
        rep.consistency_score = self._compute_consistency_score(rep)

        # Compute weighted composite EMA score
        latest_composite = (
            DIMENSION_WEIGHTS["success_rate"] * rep.success_rate_score
            + DIMENSION_WEIGHTS["time_reliability"] * rep.time_reliability_score
            + DIMENSION_WEIGHTS["quality"] * rep.quality_ema
            + DIMENSION_WEIGHTS["consistency"] * rep.consistency_score
        )
        rep.ema_score = self._ema_update(rep.ema_score, latest_composite)

        # Update metadata
        rep.last_updated = time.time()

        self._persist()
        return rep.ema_score

    def get_score(self, agent_id: int) -> float:
        """Get the current EMA reputation score for an agent."""
        if agent_id not in self._agents:
            return 0.0
        return self._agents[agent_id].ema_score

    def get_reputation(self, agent_id: int) -> Optional[AgentReputation]:
        """Get the full reputation profile for an agent."""
        return self._agents.get(agent_id)

    def get_risk_profile(self, agent_id: int) -> Dict:
        """
        Generate a risk assessment profile for an agent.

        Returns a dict with:
          - breach_rate: % of SLAs breached
          - avg_quality: average quality score
          - volatility: stddev of recent quality scores (inconsistency measure)
          - time_reliability: inverse of avg delivery time ratio
          - tier: reputation tier name
          - overall_risk: "low", "medium", "high", "critical"
        """
        rep = self._agents.get(agent_id)
        if not rep:
            return {
                "breach_rate": 100.0,
                "avg_quality": 0.0,
                "volatility": 100.0,
                "time_reliability": 0.0,
                "tier": "Unknown",
                "overall_risk": "critical",
            }

        avg_quality = (
            sum(rep.recent_quality_scores) / len(rep.recent_quality_scores)
            if rep.recent_quality_scores
            else 50.0
        )

        # Determine risk level from EMA score
        if rep.ema_score >= 70:
            risk = "low"
        elif rep.ema_score >= 50:
            risk = "medium"
        elif rep.ema_score >= 30:
            risk = "high"
        else:
            risk = "critical"

        # Determine tier
        tier_info = self._get_tier(rep.ema_score)

        return {
            "breach_rate": rep.breach_rate,
            "avg_quality": round(avg_quality, 1),
            "volatility": round(rep.quality_volatility, 1),
            "time_reliability": round(rep.time_reliability_score, 1),
            "tier": tier_info["tier"],
            "tier_color": tier_info["color"],
            "tier_description": tier_info["description"],
            "overall_risk": risk,
            "ema_score": round(rep.ema_score, 1),
            "total_slas": rep.total_slas,
            "success_rate": round(rep.success_rate, 1),
        }

    def rank_providers(
        self,
        agent_ids: List[int],
        weights: Optional[Dict[str, float]] = None,
    ) -> List[Dict]:
        """
        Rank multiple agents by reputation using multi-criteria scoring.

        Args:
            agent_ids: List of agent IDs to rank
            weights: Optional custom weights (defaults to DIMENSION_WEIGHTS)

        Returns:
            Sorted list of dicts with agent_id, score, tier, and dimensions
        """
        w = weights or DIMENSION_WEIGHTS
        rankings = []

        for aid in agent_ids:
            rep = self._agents.get(aid)
            if not rep:
                continue

            # Compute weighted score
            weighted = (
                w.get("success_rate", 0.35) * rep.success_rate_score
                + w.get("time_reliability", 0.25) * rep.time_reliability_score
                + w.get("quality", 0.25) * rep.quality_ema
                + w.get("consistency", 0.15) * rep.consistency_score
            )

            tier_info = self._get_tier(rep.ema_score)

            rankings.append({
                "agent_id": aid,
                "init_username": rep.init_username,
                "service_type": rep.service_type,
                "ema_score": round(rep.ema_score, 1),
                "weighted_score": round(weighted, 1),
                "tier": tier_info["tier"],
                "dimensions": {
                    "success_rate": round(rep.success_rate_score, 1),
                    "time_reliability": round(rep.time_reliability_score, 1),
                    "quality": round(rep.quality_ema, 1),
                    "consistency": round(rep.consistency_score, 1),
                },
                "total_slas": rep.total_slas,
                "breach_rate": round(rep.breach_rate, 1),
            })

        # Sort by weighted score descending
        rankings.sort(key=lambda x: x["weighted_score"], reverse=True)
        return rankings

    def get_all_agents(self) -> List[Dict]:
        """Get summary of all registered agents with reputation data."""
        result = []
        for aid, rep in self._agents.items():
            tier_info = self._get_tier(rep.ema_score)
            result.append({
                "agent_id": aid,
                "init_username": rep.init_username,
                "service_type": rep.service_type,
                "ema_score": round(rep.ema_score, 1),
                "tier": tier_info["tier"],
                "total_slas": rep.total_slas,
                "success_rate": round(rep.success_rate, 1),
            })
        return result

    # ─── Private Methods ───────────────────────────────────────────

    @staticmethod
    def _ema_update(previous: float, latest: float) -> float:
        """Apply EMA smoothing: new = α × latest + (1 - α) × previous."""
        return EMA_ALPHA * latest + (1 - EMA_ALPHA) * previous

    @staticmethod
    def _compute_success_score(rep: AgentReputation) -> float:
        """Score based on SLA success rate. 100% settled = 100, 0% = 0."""
        if rep.total_slas == 0:
            return 50.0  # Neutral for new agents
        return (rep.settled_count / rep.total_slas) * 100

    @staticmethod
    def _compute_time_score(
        rep: AgentReputation, latest_outcome: OutcomeRecord
    ) -> float:
        """
        Score based on delivery timeliness.
        Ratio < 0.5 = excellent (100), ratio = 1.0 = deadline (50), ratio > 1.0 = late (0)
        """
        ratio = latest_outcome.delivery_time_ratio

        # Update running average
        n = rep.total_slas
        rep.avg_delivery_time_ratio = (
            (rep.avg_delivery_time_ratio * (n - 1) + ratio) / n
            if n > 0
            else ratio
        )

        # Score: inverse mapping of ratio to 0-100
        if ratio <= 0.3:
            return 100.0
        elif ratio <= 0.5:
            return 90.0
        elif ratio <= 0.7:
            return 75.0
        elif ratio <= 0.9:
            return 60.0
        elif ratio <= 1.0:
            return 50.0
        else:
            # Late delivery — rapid score decay
            return max(0.0, 50.0 - (ratio - 1.0) * 100)

    @staticmethod
    def _compute_consistency_score(rep: AgentReputation) -> float:
        """
        Score based on consistency of performance.
        Low volatility = high consistency score.
        """
        vol = rep.quality_volatility
        if vol <= 5:
            return 100.0  # Very consistent
        elif vol <= 10:
            return 85.0
        elif vol <= 15:
            return 70.0
        elif vol <= 25:
            return 50.0
        else:
            return max(0.0, 100.0 - vol * 2)

    @staticmethod
    def _get_tier(score: float) -> Dict:
        """Map a reputation score to its tier."""
        for (low, high), info in REPUTATION_TIERS.items():
            if low <= score <= high:
                return info
        return {"tier": "Unknown", "color": "#94a3b8", "description": "Insufficient data"}

    def _persist(self):
        """Persist reputation data to JSON file."""
        try:
            os.makedirs(os.path.dirname(self._persistence_path), exist_ok=True)
            data = {}
            for aid, rep in self._agents.items():
                data[str(aid)] = {
                    "agent_id": rep.agent_id,
                    "init_username": rep.init_username,
                    "service_type": rep.service_type,
                    "total_slas": rep.total_slas,
                    "settled_count": rep.settled_count,
                    "breached_count": rep.breached_count,
                    "disputed_count": rep.disputed_count,
                    "cancelled_count": rep.cancelled_count,
                    "ema_score": rep.ema_score,
                    "success_rate_score": rep.success_rate_score,
                    "time_reliability_score": rep.time_reliability_score,
                    "quality_ema": rep.quality_ema,
                    "consistency_score": rep.consistency_score,
                    "total_volume": rep.total_volume,
                    "avg_delivery_time_ratio": rep.avg_delivery_time_ratio,
                    "recent_quality_scores": rep.recent_quality_scores,
                    "recent_outcomes": rep.recent_outcomes,
                    "registered_at": rep.registered_at,
                    "last_updated": rep.last_updated,
                }
            with open(self._persistence_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass  # Graceful degradation — in-memory still works

    def _load_persisted(self):
        """Load reputation data from JSON file if available."""
        try:
            if os.path.exists(self._persistence_path):
                with open(self._persistence_path) as f:
                    data = json.load(f)
                for aid_str, d in data.items():
                    aid = int(aid_str)
                    self._agents[aid] = AgentReputation(
                        agent_id=d["agent_id"],
                        init_username=d["init_username"],
                        service_type=d["service_type"],
                        total_slas=d.get("total_slas", 0),
                        settled_count=d.get("settled_count", 0),
                        breached_count=d.get("breached_count", 0),
                        disputed_count=d.get("disputed_count", 0),
                        cancelled_count=d.get("cancelled_count", 0),
                        ema_score=d.get("ema_score", 50.0),
                        success_rate_score=d.get("success_rate_score", 50.0),
                        time_reliability_score=d.get("time_reliability_score", 50.0),
                        quality_ema=d.get("quality_ema", 50.0),
                        consistency_score=d.get("consistency_score", 50.0),
                        total_volume=d.get("total_volume", 0.0),
                        avg_delivery_time_ratio=d.get("avg_delivery_time_ratio", 0.5),
                        recent_quality_scores=d.get("recent_quality_scores", []),
                        recent_outcomes=d.get("recent_outcomes", []),
                        registered_at=d.get("registered_at", time.time()),
                        last_updated=d.get("last_updated", time.time()),
                    )
                    self._outcome_history[aid] = []
        except Exception:
            pass  # Start fresh if persistence is corrupted


# ─── Demo Initialization ─────────────────────────────────────────

def create_demo_reputation_engine() -> ReputationEngine:
    """Create a reputation engine pre-loaded with demo agent data."""
    engine = ReputationEngine()

    # Register demo agents
    engine.register_agent(1, "acme-analyst", "data-analysis")
    engine.register_agent(2, "globex-buyer", "procurement")

    # Simulate historical outcomes for acme-analyst
    engine.record_outcome(OutcomeRecord(
        sla_id=1, outcome="settled",
        quality_score=85.0, delivery_time_ratio=0.65,
        payment_amount=30.0, timestamp=time.time() - 3600,
    ), agent_id=1)

    engine.record_outcome(OutcomeRecord(
        sla_id=2, outcome="breached",
        quality_score=0.0, delivery_time_ratio=1.5,
        payment_amount=30.0, timestamp=time.time() - 1800,
    ), agent_id=1)

    return engine
