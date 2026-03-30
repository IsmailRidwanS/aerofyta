"""
AeroFyta Quality Evaluator — Delivery Quality Assessment Engine

Implements a multi-dimensional quality evaluation system that assesses AI agent
deliveries against SLA requirements and oracle ground truth. This is the critical
component that determines whether a delivery should be settled, disputed, or flagged.

Quality Dimensions (each scored 0-25, total 0-100):
  1. Completeness  — Are all required output fields present?
  2. Accuracy      — Does reported data match oracle ground truth?
  3. Timeliness    — Was delivery within deadline, and how efficiently?
  4. Depth         — Analytical rigor (pool count, risk warnings, allocation coherence)

Decision Thresholds:
  - Score >= 60: SETTLE — Quality meets SLA standards
  - Score 40-59: FLAG   — Borderline, recommend manual review
  - Score <  40: DISPUTE — Quality below acceptable threshold

The accuracy check cross-references agent-reported data against fresh oracle
data, catching stale, fabricated, or incorrect analysis.
"""

import time
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class Recommendation(Enum):
    """Evaluator's recommended action for the buyer."""
    SETTLE = "settle"
    DISPUTE = "dispute"
    FLAG = "flag"        # Borderline — needs human review
    REJECT = "reject"    # Fundamentally invalid delivery


@dataclass
class QualityDimension:
    """A single quality dimension score with evidence."""
    name: str
    score: float          # 0-25
    max_score: float      # Always 25
    findings: List[str]   # Evidence for the score
    passed: bool          # Whether this dimension passes minimum threshold

    @property
    def percentage(self) -> float:
        return (self.score / self.max_score) * 100 if self.max_score > 0 else 0


@dataclass
class EvaluationResult:
    """Complete evaluation result for a delivery."""
    sla_id: int
    overall_score: float              # 0-100
    dimensions: Dict[str, QualityDimension]
    recommendation: Recommendation
    confidence: float                  # 0-1, how confident in the evaluation
    evidence: List[str]               # Summary of key findings
    passed: bool                      # Overall pass/fail
    evaluated_at: float = field(default_factory=time.time)

    @property
    def summary(self) -> str:
        """One-line summary of the evaluation."""
        status = "PASS" if self.passed else "FAIL"
        return (
            f"[{status}] Score: {self.overall_score:.0f}/100 | "
            f"Recommendation: {self.recommendation.value.upper()} | "
            f"Confidence: {self.confidence:.0%}"
        )


# ─── Thresholds ───────────────────────────────────────────────────

SETTLE_THRESHOLD = 60.0      # Score >= 60 → recommend settlement
FLAG_THRESHOLD = 40.0         # Score 40-59 → flag for review
DISPUTE_THRESHOLD = 40.0      # Score < 40 → recommend dispute

# Accuracy tolerance for oracle cross-reference
PRICE_TOLERANCE_PCT = 15.0    # Allow 15% deviation from oracle prices
APY_TOLERANCE_PCT = 20.0      # Allow 20% deviation for APY (more volatile)
TVL_TOLERANCE_PCT = 25.0      # Allow 25% deviation for TVL (can change fast)


class QualityEvaluator:
    """
    Multi-dimensional delivery quality evaluation engine.

    Assesses AI agent outputs against SLA requirements and oracle ground truth
    to produce an actionable recommendation (settle, dispute, or flag).

    Usage:
        evaluator = QualityEvaluator()

        result = evaluator.evaluate(
            sla_id=1,
            delivery=agent_output,
            sla_spec={"service_type": "data-analysis", "deadline": 1712000000},
            oracle_data={"pools": [...], "prices": {...}},
            delivery_timestamp=1711999000,
            creation_timestamp=1711996000,
        )

        if result.recommendation == Recommendation.SETTLE:
            buyer.settle_sla(sla_id)
        elif result.recommendation == Recommendation.DISPUTE:
            buyer.dispute_sla(sla_id, result.evidence)
    """

    def evaluate(
        self,
        sla_id: int,
        delivery: Dict[str, Any],
        sla_spec: Dict[str, Any],
        oracle_data: Optional[Dict[str, Any]] = None,
        delivery_timestamp: Optional[float] = None,
        creation_timestamp: Optional[float] = None,
    ) -> EvaluationResult:
        """
        Evaluate a delivery against SLA requirements and oracle truth.

        Args:
            sla_id: The SLA identifier
            delivery: The agent's delivery output (analysis report, etc.)
            sla_spec: The original SLA specification (service_type, deadline, etc.)
            oracle_data: Fresh oracle data for accuracy cross-reference
            delivery_timestamp: When the delivery was made (unix seconds)
            creation_timestamp: When the SLA was created (unix seconds)
        """
        dimensions = {}

        # 1. Completeness check
        dimensions["completeness"] = self._assess_completeness(delivery, sla_spec)

        # 2. Accuracy check (cross-reference with oracle)
        dimensions["accuracy"] = self._assess_accuracy(delivery, oracle_data)

        # 3. Timeliness check
        dimensions["timeliness"] = self._assess_timeliness(
            sla_spec, delivery_timestamp, creation_timestamp
        )

        # 4. Depth check
        dimensions["depth"] = self._assess_depth(delivery, sla_spec)

        # Compute overall score
        overall_score = sum(d.score for d in dimensions.values())

        # Determine recommendation
        recommendation = self._determine_recommendation(overall_score, dimensions)

        # Compute confidence
        confidence = self._compute_confidence(dimensions, oracle_data)

        # Collect evidence
        evidence = self._collect_evidence(dimensions, recommendation)

        # Overall pass/fail
        passed = overall_score >= SETTLE_THRESHOLD

        return EvaluationResult(
            sla_id=sla_id,
            overall_score=overall_score,
            dimensions=dimensions,
            recommendation=recommendation,
            confidence=confidence,
            evidence=evidence,
            passed=passed,
        )

    # ─── Dimension Assessors ───────────────────────────────────────

    def _assess_completeness(
        self, delivery: Dict, sla_spec: Dict
    ) -> QualityDimension:
        """
        Assess whether the delivery contains all required fields.

        For data-analysis: pool_rankings, risk_warnings, summary, blended_apy
        For procurement: provider_list, selection_criteria, cost_analysis
        """
        findings = []
        score = 0.0
        service_type = sla_spec.get("service_type", "data-analysis")

        if service_type == "data-analysis":
            required_fields = {
                "pool_rankings": 5,
                "risk_warnings": 3,
                "summary": 5,
                "blended_apy": 4,
            }
            optional_fields = {
                "model_id": 2,
                "model_version": 2,
                "data_timestamp": 2,
                "total_data_points": 2,
            }
        elif service_type == "procurement":
            required_fields = {
                "provider_list": 5,
                "selection_criteria": 5,
                "cost_analysis": 5,
                "recommendation": 5,
            }
            optional_fields = {
                "risk_assessment": 2.5,
                "alternatives": 2.5,
            }
        else:
            required_fields = {"output": 15}
            optional_fields = {"metadata": 5, "confidence": 5}

        # Check required fields
        for field_name, points in required_fields.items():
            if field_name in delivery and delivery[field_name]:
                score += points
                findings.append(f"Required field '{field_name}': present")
            else:
                findings.append(f"Required field '{field_name}': MISSING")

        # Check optional fields
        for field_name, points in optional_fields.items():
            if field_name in delivery and delivery[field_name]:
                score += points
                findings.append(f"Optional field '{field_name}': present (bonus)")

        score = min(25.0, score)
        passed = score >= 12.5  # At least half of max

        return QualityDimension(
            name="Completeness",
            score=score,
            max_score=25.0,
            findings=findings,
            passed=passed,
        )

    def _assess_accuracy(
        self, delivery: Dict, oracle_data: Optional[Dict]
    ) -> QualityDimension:
        """
        Cross-reference delivery data against oracle ground truth.

        This is the KEY differentiator — it catches fabricated or stale data
        by comparing the agent's reported metrics against fresh oracle feeds.
        """
        findings = []
        score = 25.0  # Start at max, deduct for discrepancies

        if not oracle_data:
            findings.append("No oracle data available for cross-reference")
            return QualityDimension(
                name="Accuracy",
                score=15.0,  # Partial score — can't verify
                max_score=25.0,
                findings=findings,
                passed=True,
            )

        pool_rankings = delivery.get("pool_rankings", [])
        oracle_pools = oracle_data.get("pools", [])
        oracle_prices = oracle_data.get("prices", {})

        if not pool_rankings:
            findings.append("No pool rankings in delivery to verify")
            return QualityDimension(
                name="Accuracy",
                score=5.0,
                max_score=25.0,
                findings=["No pool data to verify against oracle"],
                passed=False,
            )

        # Build oracle lookup by pool name
        oracle_lookup = {}
        for pool in oracle_pools:
            name = pool.get("pair") or pool.get("pool") or pool.get("name", "")
            oracle_lookup[name.upper()] = pool

        verified_count = 0
        discrepancy_count = 0

        for reported_pool in pool_rankings:
            pool_name = reported_pool.get("pool", "").upper()
            oracle_pool = oracle_lookup.get(pool_name)

            if not oracle_pool:
                findings.append(f"Pool '{pool_name}': not found in oracle data")
                score -= 2.0
                discrepancy_count += 1
                continue

            verified_count += 1

            # Check APY accuracy
            reported_apy = reported_pool.get("apy", 0)
            oracle_apy = oracle_pool.get("apy", 0)
            if oracle_apy > 0:
                apy_deviation = abs(reported_apy - oracle_apy) / oracle_apy * 100
                if apy_deviation > APY_TOLERANCE_PCT:
                    findings.append(
                        f"Pool '{pool_name}' APY: reported {reported_apy}%, "
                        f"oracle {oracle_apy}% (deviation: {apy_deviation:.1f}%)"
                    )
                    score -= 3.0
                    discrepancy_count += 1
                else:
                    findings.append(f"Pool '{pool_name}' APY: verified within tolerance")

            # Check TVL accuracy
            reported_tvl = reported_pool.get("tvl", 0)
            oracle_tvl = oracle_pool.get("tvl", 0)
            if oracle_tvl > 0:
                tvl_deviation = abs(reported_tvl - oracle_tvl) / oracle_tvl * 100
                if tvl_deviation > TVL_TOLERANCE_PCT:
                    findings.append(
                        f"Pool '{pool_name}' TVL: reported ${reported_tvl}, "
                        f"oracle ${oracle_tvl} (deviation: {tvl_deviation:.1f}%)"
                    )
                    score -= 2.0
                    discrepancy_count += 1
                else:
                    findings.append(f"Pool '{pool_name}' TVL: verified within tolerance")

        # Bonus for high verification rate
        if verified_count > 0 and discrepancy_count == 0:
            findings.append(f"All {verified_count} pools verified against oracle data")
            score = min(25.0, score + 2.0)

        score = max(0.0, min(25.0, score))
        passed = score >= 12.5

        return QualityDimension(
            name="Accuracy",
            score=score,
            max_score=25.0,
            findings=findings,
            passed=passed,
        )

    def _assess_timeliness(
        self,
        sla_spec: Dict,
        delivery_timestamp: Optional[float],
        creation_timestamp: Optional[float],
    ) -> QualityDimension:
        """
        Assess delivery timeliness relative to the SLA deadline.

        Scoring:
          - Delivered in < 50% of allowed time: 25/25
          - Delivered in 50-75%: 20/25
          - Delivered in 75-90%: 15/25
          - Delivered in 90-100%: 10/25
          - Delivered late: 0/25
        """
        findings = []

        if not delivery_timestamp or not creation_timestamp:
            findings.append("Missing timestamp data — assuming on-time delivery")
            return QualityDimension(
                name="Timeliness",
                score=15.0,
                max_score=25.0,
                findings=findings,
                passed=True,
            )

        deadline = sla_spec.get("deadline", 0)
        if deadline == 0:
            # Estimate from deadline_hours
            deadline_hours = sla_spec.get("deadline_hours", 1)
            deadline = creation_timestamp + (deadline_hours * 3600)

        allowed_time = deadline - creation_timestamp
        actual_time = delivery_timestamp - creation_timestamp

        if allowed_time <= 0:
            findings.append("Invalid deadline configuration")
            return QualityDimension(
                name="Timeliness", score=12.5, max_score=25.0,
                findings=findings, passed=True,
            )

        ratio = actual_time / allowed_time
        findings.append(f"Delivery time ratio: {ratio:.2f} (actual/allowed)")

        if ratio <= 0.5:
            score = 25.0
            findings.append("Excellent: delivered well within deadline")
        elif ratio <= 0.75:
            score = 20.0
            findings.append("Good: delivered with comfortable margin")
        elif ratio <= 0.9:
            score = 15.0
            findings.append("Acceptable: delivered with some margin")
        elif ratio <= 1.0:
            score = 10.0
            findings.append("Tight: delivered just before deadline")
        else:
            score = 0.0
            findings.append(f"LATE: delivery exceeded deadline by {(ratio - 1) * 100:.1f}%")

        return QualityDimension(
            name="Timeliness",
            score=score,
            max_score=25.0,
            findings=findings,
            passed=score > 0,
        )

    def _assess_depth(
        self, delivery: Dict, sla_spec: Dict
    ) -> QualityDimension:
        """
        Assess the analytical depth and rigor of the delivery.

        Checks:
          - Number of data points analyzed
          - Presence and quality of risk warnings
          - Allocation coherence (sums to ~100%)
          - Blended APY calculation consistency
          - Model attribution present
          - Confidence scores reasonable
        """
        findings = []
        score = 0.0

        service_type = sla_spec.get("service_type", "data-analysis")

        if service_type == "data-analysis":
            pool_rankings = delivery.get("pool_rankings", [])

            # Check pool count (more pools = deeper analysis)
            pool_count = len(pool_rankings)
            if pool_count >= 5:
                score += 5.0
                findings.append(f"Analyzed {pool_count} pools (comprehensive)")
            elif pool_count >= 3:
                score += 4.0
                findings.append(f"Analyzed {pool_count} pools (adequate)")
            elif pool_count >= 1:
                score += 2.0
                findings.append(f"Only {pool_count} pool(s) analyzed (shallow)")
            else:
                findings.append("No pools analyzed")

            # Check risk warnings
            risk_warnings = delivery.get("risk_warnings", [])
            if len(risk_warnings) >= 2:
                score += 4.0
                findings.append(f"{len(risk_warnings)} risk warnings identified")
            elif len(risk_warnings) == 1:
                score += 2.0
                findings.append("Only 1 risk warning (may be incomplete)")
            else:
                findings.append("No risk warnings (suspicious for any real analysis)")

            # Check allocation coherence
            total_alloc = sum(p.get("allocation_pct", 0) for p in pool_rankings)
            if 95 <= total_alloc <= 105:
                score += 5.0
                findings.append(f"Allocation sums to {total_alloc}% (coherent)")
            elif 80 <= total_alloc <= 120:
                score += 2.0
                findings.append(f"Allocation sums to {total_alloc}% (acceptable)")
            else:
                findings.append(f"Allocation sums to {total_alloc}% (INCOHERENT)")

            # Check blended APY consistency
            blended_apy = delivery.get("blended_apy", 0)
            if pool_rankings and blended_apy > 0:
                calculated_blended = sum(
                    p.get("apy", 0) * p.get("allocation_pct", 0) / 100
                    for p in pool_rankings
                )
                if abs(calculated_blended - blended_apy) / max(blended_apy, 0.01) < 0.15:
                    score += 4.0
                    findings.append(f"Blended APY ({blended_apy}%) is consistent with pool data")
                else:
                    score += 1.0
                    findings.append(
                        f"Blended APY mismatch: reported {blended_apy}%, "
                        f"calculated {calculated_blended:.1f}%"
                    )

            # Check confidence scores
            has_confidence = any(
                "confidence" in p and 0 < p["confidence"] <= 100
                for p in pool_rankings
            )
            if has_confidence:
                score += 3.0
                findings.append("Confidence scores present and reasonable")

            # Check model attribution
            if delivery.get("model_id") and delivery.get("model_version"):
                score += 2.0
                findings.append(
                    f"Model attribution: {delivery['model_id']} v{delivery['model_version']}"
                )

            # Check data points
            data_points = delivery.get("total_data_points", 0)
            if data_points >= 30:
                score += 2.0
                findings.append(f"Based on {data_points} data points (rich)")
            elif data_points >= 10:
                score += 1.0
                findings.append(f"Based on {data_points} data points (moderate)")

        else:
            # Generic depth check for non-analysis deliveries
            if len(str(delivery)) > 500:
                score += 10.0
                findings.append("Substantial output volume")
            if delivery.get("model_id"):
                score += 5.0
                findings.append("Model attribution present")
            if delivery.get("confidence"):
                score += 5.0
                findings.append("Confidence measure provided")
            score += 5.0  # Base for having any output

        score = min(25.0, score)
        passed = score >= 10.0

        return QualityDimension(
            name="Depth",
            score=score,
            max_score=25.0,
            findings=findings,
            passed=passed,
        )

    # ─── Helpers ───────────────────────────────────────────────────

    @staticmethod
    def _determine_recommendation(
        score: float, dimensions: Dict[str, QualityDimension]
    ) -> Recommendation:
        """Determine the recommended action based on score and dimensions."""
        # Check for fundamental failures
        accuracy = dimensions.get("accuracy")
        if accuracy and accuracy.score < 5:
            return Recommendation.REJECT  # Fabricated data

        if score >= SETTLE_THRESHOLD:
            return Recommendation.SETTLE
        elif score >= FLAG_THRESHOLD:
            return Recommendation.FLAG
        else:
            return Recommendation.DISPUTE

    @staticmethod
    def _compute_confidence(
        dimensions: Dict[str, QualityDimension],
        oracle_data: Optional[Dict],
    ) -> float:
        """
        Compute evaluation confidence based on available data.

        Higher confidence when:
        - Oracle data is available for cross-reference
        - All dimensions have sufficient evidence
        - Scores are clearly above or below thresholds (not borderline)
        """
        confidence = 0.5  # Base confidence

        # Oracle availability bonus
        if oracle_data and oracle_data.get("pools"):
            confidence += 0.2

        # Evidence richness
        total_findings = sum(len(d.findings) for d in dimensions.values())
        if total_findings >= 10:
            confidence += 0.15
        elif total_findings >= 5:
            confidence += 0.08

        # Score clarity (far from threshold = more confident)
        total_score = sum(d.score for d in dimensions.values())
        distance_from_threshold = abs(total_score - SETTLE_THRESHOLD)
        if distance_from_threshold > 20:
            confidence += 0.15
        elif distance_from_threshold > 10:
            confidence += 0.08

        return min(1.0, confidence)

    @staticmethod
    def _collect_evidence(
        dimensions: Dict[str, QualityDimension],
        recommendation: Recommendation,
    ) -> List[str]:
        """Collect the most important findings as summary evidence."""
        evidence = []

        for dim_name, dim in dimensions.items():
            # Include failed dimensions prominently
            if not dim.passed:
                evidence.append(f"[FAIL] {dim.name}: {dim.score:.0f}/{dim.max_score:.0f}")
                # Include first finding as detail
                if dim.findings:
                    evidence.append(f"  → {dim.findings[-1]}")
            else:
                evidence.append(f"[PASS] {dim.name}: {dim.score:.0f}/{dim.max_score:.0f}")

        evidence.append(f"Recommendation: {recommendation.value.upper()}")
        return evidence
