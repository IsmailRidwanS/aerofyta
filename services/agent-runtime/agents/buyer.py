"""
AeroFyta — Buyer/Procurement AI Agent
Discovers providers, creates SLAs, evaluates deliveries, settles or disputes.
"""

import json
import hashlib
import time
from typing import Optional

from core.oracle import OracleClient
from core.chain import ChainClient


class BuyerAgent:
    """
    Autonomous procurement agent that discovers providers,
    creates SLAs, and settles or disputes deliveries.
    """

    def __init__(
        self,
        agent_id: int,
        init_username: str,
        chain: Optional[ChainClient] = None,
    ):
        self.agent_id = agent_id
        self.init_username = init_username
        self.chain = chain

    async def discover_providers(self, service_type: str) -> list[dict]:
        """
        Query AgentVault for active providers of a given service type.
        Returns list of providers with their stake and performance data.
        """
        if not self.chain:
            # Demo providers
            return [
                {
                    "agent_id": 1,
                    "init_username": "acme-analyst.init",
                    "service_type": "data-analysis",
                    "stake": 200.0,
                    "performance_score": 50.0,
                    "description": "AI data analyst powered by Claude Sonnet 4",
                },
            ]

        # In production: query AgentVault.getActiveAgents() and filter
        return []

    async def create_sla(
        self,
        provider_agent_id: int,
        service_type: str,
        task_spec: str,
        payment_init: float,
        deadline_seconds: int,
        slash_penalty_init: float,
    ) -> dict:
        """
        Create an SLA with escrowed payment.
        Returns SLA details including on-chain tx hash.
        """
        input_spec_hash = "0x" + hashlib.sha256(task_spec.encode()).hexdigest()

        print(f"[{self.init_username}] Creating SLA:")
        print(f"  Provider: Agent #{provider_agent_id}")
        print(f"  Service: {service_type}")
        print(f"  Payment: {payment_init} INIT")
        print(f"  Deadline: {deadline_seconds}s")
        print(f"  Slash penalty: {slash_penalty_init} INIT")

        if self.chain:
            # In production: call SLAEngine.createAgreement()
            pass

        return {
            "sla_id": 1,  # Placeholder
            "client_agent_id": self.agent_id,
            "provider_agent_id": provider_agent_id,
            "service_type": service_type,
            "payment": payment_init,
            "deadline_seconds": deadline_seconds,
            "slash_penalty": slash_penalty_init,
            "input_spec_hash": input_spec_hash,
            "status": "proposed",
            "created_at": int(time.time()),
        }

    async def evaluate_delivery(self, sla_id: int, output_hash: str, report: dict) -> dict:
        """
        Evaluate whether a delivery meets the SLA quality criteria.
        Returns evaluation result with settle/dispute recommendation.
        """
        # Simple quality checks for v1
        checks = {
            "has_pool_rankings": len(report.get("pool_rankings", [])) > 0,
            "has_summary": len(report.get("summary", "")) > 10,
            "has_risk_warnings": "risk_warnings" in report,
            "blended_apy_reasonable": 0 < report.get("blended_apy", 0) < 100,
        }

        all_passed = all(checks.values())
        failed = [k for k, v in checks.items() if not v]

        result = {
            "sla_id": sla_id,
            "output_hash": output_hash,
            "checks": checks,
            "all_passed": all_passed,
            "failed_checks": failed,
            "recommendation": "settle" if all_passed else "dispute",
            "reason": "All quality criteria met" if all_passed else f"Failed: {', '.join(failed)}",
        }

        print(f"[{self.init_username}] Evaluated SLA #{sla_id}: {result['recommendation']}")
        if not all_passed:
            print(f"  Failed checks: {failed}")

        return result

    async def settle_sla(self, sla_id: int) -> str:
        """Settle an SLA (confirm delivery and release payment)."""
        print(f"[{self.init_username}] Settling SLA #{sla_id}")

        if self.chain:
            # In production: call SLAEngine.settle()
            pass

        return "0x" + "0" * 64  # Placeholder tx hash

    async def dispute_sla(self, sla_id: int, reason: str) -> str:
        """Dispute an SLA delivery."""
        print(f"[{self.init_username}] Disputing SLA #{sla_id}: {reason}")

        if self.chain:
            # In production: call SLAEngine.disputeDelivery()
            pass

        return "0x" + "0" * 64  # Placeholder tx hash
