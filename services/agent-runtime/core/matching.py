"""
AeroFyta Matching Engine — Intelligent Provider-Task Matching

Implements a multi-criteria matching algorithm that pairs SLA task requirements
with available provider agents. The engine considers reputation, pricing,
availability, specialization, and risk tolerance to produce optimal matches.

Matching Pipeline:
  1. Filter by service_type compatibility
  2. Filter by minimum stake threshold (skin in game)
  3. Score candidates on 4 dimensions
  4. Apply risk_tolerance modifier
  5. Return ranked list with match confidence + explanations

This replaces hardcoded provider lists with genuine autonomous discovery.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum

from .reputation import ReputationEngine


class RiskTolerance(Enum):
    """Buyer's risk appetite for provider selection."""
    CONSERVATIVE = "conservative"  # Favor high reputation, accept higher price
    BALANCED = "balanced"          # Default balanced weights
    AGGRESSIVE = "aggressive"      # Favor lower price, accept lower reputation


@dataclass
class TaskSpec:
    """Specification for a task that needs a provider."""
    service_type: str
    description: str
    budget: float                   # Max payment in INIT
    deadline_hours: float           # Hours allowed for delivery
    min_provider_stake: float = 50  # Minimum stake requirement
    quality_threshold: float = 60   # Minimum acceptable quality score
    required_confidence: float = 0.5  # Minimum match confidence

    @property
    def complexity(self) -> str:
        """Estimate task complexity from budget and deadline."""
        if self.budget >= 100 or self.deadline_hours >= 24:
            return "high"
        elif self.budget >= 30 or self.deadline_hours >= 4:
            return "medium"
        return "low"


@dataclass
class ProviderCandidate:
    """A potential provider agent with scoring metadata."""
    agent_id: int
    init_username: str
    service_type: str
    stake: float
    active_slas: int
    earnings: float
    is_active: bool


@dataclass
class ProviderMatch:
    """A scored and ranked provider match result."""
    agent_id: int
    init_username: str
    service_type: str
    reputation_score: float
    price_estimate: float
    estimated_delivery_hours: float
    risk_score: float
    match_confidence: float
    match_score: float
    rank: int
    explanation: str
    dimensions: Dict[str, float] = field(default_factory=dict)


# Default scoring weights per risk tolerance
WEIGHT_PROFILES = {
    RiskTolerance.CONSERVATIVE: {
        "reputation": 0.45,
        "price_efficiency": 0.15,
        "availability": 0.20,
        "specialization": 0.20,
    },
    RiskTolerance.BALANCED: {
        "reputation": 0.30,
        "price_efficiency": 0.25,
        "availability": 0.25,
        "specialization": 0.20,
    },
    RiskTolerance.AGGRESSIVE: {
        "reputation": 0.15,
        "price_efficiency": 0.40,
        "availability": 0.25,
        "specialization": 0.20,
    },
}


class MatchingEngine:
    """
    Multi-criteria provider-task matching engine.

    Uses reputation scores, pricing heuristics, availability, and
    specialization to find the optimal provider for a given task.

    Usage:
        engine = MatchingEngine(reputation_engine)

        matches = engine.match_providers(
            task=TaskSpec(service_type="data-analysis", budget=30, deadline_hours=1),
            candidates=providers_from_chain,
            risk_tolerance=RiskTolerance.BALANCED,
        )

        for m in matches:
            print(f"{m.init_username}: score={m.match_score}, confidence={m.match_confidence}")
    """

    def __init__(self, reputation: ReputationEngine):
        self._reputation = reputation

    def match_providers(
        self,
        task: TaskSpec,
        candidates: List[ProviderCandidate],
        risk_tolerance: RiskTolerance = RiskTolerance.BALANCED,
    ) -> List[ProviderMatch]:
        """
        Find and rank providers for a given task.

        Returns a sorted list of ProviderMatch objects (best match first).
        """
        weights = WEIGHT_PROFILES[risk_tolerance]

        # Step 1: Filter by service_type compatibility
        compatible = [c for c in candidates if self._is_compatible(c, task)]

        # Step 2: Filter by minimum stake threshold
        staked = [c for c in compatible if c.stake >= task.min_provider_stake]

        # Step 3: Filter by active status
        active = [c for c in staked if c.is_active]

        if not active:
            return []

        # Step 4: Score each candidate
        scored = []
        for candidate in active:
            scores = self._score_candidate(candidate, task, weights)
            match = self._build_match(candidate, task, scores, weights)
            if match.match_confidence >= task.required_confidence:
                scored.append(match)

        # Step 5: Sort by match_score descending
        scored.sort(key=lambda m: m.match_score, reverse=True)

        # Assign ranks
        for i, m in enumerate(scored):
            m.rank = i + 1

        return scored

    def find_best_provider(
        self,
        task: TaskSpec,
        candidates: List[ProviderCandidate],
        risk_tolerance: RiskTolerance = RiskTolerance.BALANCED,
    ) -> Optional[ProviderMatch]:
        """Find the single best provider for a task. Returns None if no match."""
        matches = self.match_providers(task, candidates, risk_tolerance)
        return matches[0] if matches else None

    def explain_match(self, match: ProviderMatch) -> Dict:
        """Generate a human-readable explanation of why a provider was matched."""
        return {
            "provider": f"{match.init_username}.init",
            "match_score": round(match.match_score, 1),
            "confidence": f"{match.match_confidence:.0%}",
            "estimated_price": f"{match.price_estimate:.2f} INIT",
            "estimated_delivery": f"{match.estimated_delivery_hours:.1f}h",
            "risk": self._risk_label(match.risk_score),
            "breakdown": {
                "reputation": f"{match.dimensions.get('reputation', 0):.1f}/100",
                "price_efficiency": f"{match.dimensions.get('price_efficiency', 0):.1f}/100",
                "availability": f"{match.dimensions.get('availability', 0):.1f}/100",
                "specialization": f"{match.dimensions.get('specialization', 0):.1f}/100",
            },
            "explanation": match.explanation,
        }

    # ─── Private Methods ───────────────────────────────────────────

    @staticmethod
    def _is_compatible(candidate: ProviderCandidate, task: TaskSpec) -> bool:
        """Check if a provider's service type is compatible with the task."""
        # Exact match is best
        if candidate.service_type == task.service_type:
            return True
        # General-purpose agents can handle any task (with lower specialization score)
        if candidate.service_type == "general":
            return True
        return False

    def _score_candidate(
        self,
        candidate: ProviderCandidate,
        task: TaskSpec,
        weights: Dict[str, float],
    ) -> Dict[str, float]:
        """Compute scoring dimensions for a candidate."""

        # 1. Reputation score (0-100)
        rep_score = self._reputation.get_score(candidate.agent_id)

        # 2. Price efficiency (0-100)
        # Estimate price based on historical data or fallback heuristic
        estimated_price = self._estimate_price(candidate, task)
        if task.budget > 0:
            price_efficiency = max(0, min(100, (1 - estimated_price / task.budget) * 100))
        else:
            price_efficiency = 50.0

        # 3. Availability (0-100)
        # Fewer active SLAs = more available
        if candidate.active_slas == 0:
            availability = 100.0
        elif candidate.active_slas == 1:
            availability = 60.0
        elif candidate.active_slas == 2:
            availability = 30.0
        else:
            availability = max(0, 10.0)

        # 4. Specialization (0-100)
        # Exact match = 100, general = 50, different = 0
        if candidate.service_type == task.service_type:
            specialization = 100.0
        elif candidate.service_type == "general":
            specialization = 50.0
        else:
            specialization = 0.0

        return {
            "reputation": rep_score,
            "price_efficiency": price_efficiency,
            "availability": availability,
            "specialization": specialization,
        }

    def _build_match(
        self,
        candidate: ProviderCandidate,
        task: TaskSpec,
        scores: Dict[str, float],
        weights: Dict[str, float],
    ) -> ProviderMatch:
        """Build a ProviderMatch from scoring results."""

        # Weighted composite score
        match_score = sum(
            weights.get(dim, 0.25) * scores.get(dim, 0)
            for dim in ["reputation", "price_efficiency", "availability", "specialization"]
        )

        # Confidence based on data availability and score distribution
        confidence = self._compute_confidence(candidate, scores)

        # Risk score (inverse of safety)
        risk_score = self._compute_risk(candidate, scores)

        # Price and time estimates
        estimated_price = self._estimate_price(candidate, task)
        estimated_delivery = self._estimate_delivery_time(candidate, task)

        # Generate explanation
        explanation = self._generate_explanation(candidate, scores, task)

        return ProviderMatch(
            agent_id=candidate.agent_id,
            init_username=candidate.init_username,
            service_type=candidate.service_type,
            reputation_score=scores["reputation"],
            price_estimate=estimated_price,
            estimated_delivery_hours=estimated_delivery,
            risk_score=risk_score,
            match_confidence=confidence,
            match_score=match_score,
            rank=0,  # Assigned after sorting
            explanation=explanation,
            dimensions=scores,
        )

    def _estimate_price(
        self, candidate: ProviderCandidate, task: TaskSpec
    ) -> float:
        """
        Estimate the fair price for a provider to complete a task.

        Uses a heuristic based on task complexity, provider reputation,
        and historical earnings/SLA ratio.
        """
        rep = self._reputation.get_reputation(candidate.agent_id)

        # Base price by complexity
        complexity_base = {
            "low": 10.0,
            "medium": 25.0,
            "high": 75.0,
        }
        base = complexity_base.get(task.complexity, 25.0)

        # Reputation premium: higher rep agents charge more
        rep_multiplier = 1.0
        if rep and rep.ema_score >= 80:
            rep_multiplier = 1.3  # Premium for top agents
        elif rep and rep.ema_score >= 60:
            rep_multiplier = 1.1

        # Historical average: if agent has earnings data, use it
        if rep and rep.total_slas > 0:
            historical_avg = rep.total_volume / rep.total_slas
            # Blend historical with base estimate
            estimated = 0.6 * historical_avg + 0.4 * (base * rep_multiplier)
        else:
            estimated = base * rep_multiplier

        return min(estimated, task.budget)  # Never exceed budget

    def _estimate_delivery_time(
        self, candidate: ProviderCandidate, task: TaskSpec
    ) -> float:
        """Estimate delivery time in hours based on provider history."""
        rep = self._reputation.get_reputation(candidate.agent_id)

        if rep and rep.avg_delivery_time_ratio > 0:
            # Use historical delivery ratio
            return task.deadline_hours * rep.avg_delivery_time_ratio
        else:
            # Default: assume 70% of deadline
            return task.deadline_hours * 0.7

    @staticmethod
    def _compute_confidence(
        candidate: ProviderCandidate, scores: Dict[str, float]
    ) -> float:
        """
        Compute match confidence based on data completeness and score strength.

        Higher confidence when:
        - Provider has completed many SLAs (more data)
        - Scores are consistently high across dimensions
        - Provider is specialized for the task
        """
        # Data completeness factor
        data_factor = min(1.0, candidate.earnings / 100) if candidate.earnings > 0 else 0.3

        # Score strength factor (average of dimension scores normalized)
        avg_score = sum(scores.values()) / len(scores) if scores else 0
        strength_factor = avg_score / 100

        # Specialization bonus
        spec_bonus = 0.1 if scores.get("specialization", 0) >= 80 else 0

        confidence = (0.4 * data_factor + 0.5 * strength_factor + spec_bonus)
        return min(1.0, max(0.0, confidence))

    @staticmethod
    def _compute_risk(
        candidate: ProviderCandidate, scores: Dict[str, float]
    ) -> float:
        """Compute risk score (0 = safe, 100 = dangerous)."""
        # Inverse of reputation and availability
        rep_risk = 100 - scores.get("reputation", 50)
        avail_risk = 100 - scores.get("availability", 50)

        # Stake adequacy (higher stake = lower risk)
        stake_risk = max(0, 100 - candidate.stake)

        return (0.5 * rep_risk + 0.3 * avail_risk + 0.2 * stake_risk)

    @staticmethod
    def _risk_label(risk_score: float) -> str:
        """Human-readable risk label."""
        if risk_score <= 25:
            return "Low Risk"
        elif risk_score <= 50:
            return "Medium Risk"
        elif risk_score <= 75:
            return "High Risk"
        return "Critical Risk"

    @staticmethod
    def _generate_explanation(
        candidate: ProviderCandidate,
        scores: Dict[str, float],
        task: TaskSpec,
    ) -> str:
        """Generate a human-readable explanation for this match."""
        parts = []

        rep = scores.get("reputation", 0)
        if rep >= 80:
            parts.append(f"Elite reputation ({rep:.0f}/100)")
        elif rep >= 60:
            parts.append(f"Good reputation ({rep:.0f}/100)")
        elif rep >= 40:
            parts.append(f"Average reputation ({rep:.0f}/100)")
        else:
            parts.append(f"Low reputation ({rep:.0f}/100)")

        avail = scores.get("availability", 0)
        if avail >= 80:
            parts.append("fully available")
        elif avail >= 50:
            parts.append("partially available")
        else:
            parts.append("limited availability")

        if scores.get("specialization", 0) >= 80:
            parts.append(f"specialized in {task.service_type}")
        elif scores.get("specialization", 0) >= 50:
            parts.append("general-purpose agent")

        return "; ".join(parts) + "."


# ─── Demo Helpers ─────────────────────────────────────────────────

def create_demo_candidates() -> List[ProviderCandidate]:
    """Create demo provider candidates for testing."""
    return [
        ProviderCandidate(
            agent_id=1,
            init_username="acme-analyst",
            service_type="data-analysis",
            stake=200.0,
            active_slas=0,
            earnings=29.85,
            is_active=True,
        ),
        ProviderCandidate(
            agent_id=2,
            init_username="globex-buyer",
            service_type="procurement",
            stake=100.0,
            active_slas=0,
            earnings=42.0,
            is_active=True,
        ),
    ]
