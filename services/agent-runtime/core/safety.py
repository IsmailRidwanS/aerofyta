"""
AeroFyta — Pre-Transaction Safety Engine
Rule-based validation that runs BEFORE any AI decision reaches the blockchain.
Defense-in-depth: this catches bad decisions off-chain (fast, free).
The smart contract catches them on-chain (trustless, immutable).
"""

from dataclasses import dataclass
from typing import Optional
import time


@dataclass
class SafetyConfig:
    """Configuration for agent safety boundaries."""
    max_per_tx: float  # Maximum INIT per transaction
    budget_remaining: float  # Remaining budget
    whitelisted_contracts: list[str]  # Allowed contract addresses
    min_pool_tvl: float = 5000.0  # Minimum pool TVL to interact with
    max_slippage: float = 0.03  # Maximum 3% slippage
    oracle_max_age: int = 30  # Maximum oracle data age in seconds


@dataclass
class SafetyCheck:
    """Result of a safety validation check."""
    passed: bool
    reason: str
    check_name: str


def validate_action(
    action: dict,
    config: SafetyConfig,
    oracle_timestamp: Optional[int] = None,
) -> list[SafetyCheck]:
    """
    Run all safety checks against a proposed agent action.
    Returns list of check results. Action is safe only if ALL checks pass.
    """
    checks = []

    # CHECK 1: Amount within per-tx limit
    amount = float(action.get("amount", 0))
    checks.append(SafetyCheck(
        passed=amount <= config.max_per_tx,
        reason=f"Amount {amount} vs max {config.max_per_tx}",
        check_name="per_tx_limit",
    ))

    # CHECK 2: Amount within remaining budget
    checks.append(SafetyCheck(
        passed=amount <= config.budget_remaining,
        reason=f"Amount {amount} vs budget {config.budget_remaining}",
        check_name="budget_check",
    ))

    # CHECK 3: Target contract is whitelisted
    target = action.get("target_contract", "")
    if target and config.whitelisted_contracts:
        checks.append(SafetyCheck(
            passed=target.lower() in [c.lower() for c in config.whitelisted_contracts],
            reason=f"Target {target} {'is' if target.lower() in [c.lower() for c in config.whitelisted_contracts] else 'is NOT'} whitelisted",
            check_name="whitelist_check",
        ))

    # CHECK 4: Pool TVL above minimum (if applicable)
    pool_tvl = float(action.get("pool_tvl", float("inf")))
    if pool_tvl != float("inf"):
        checks.append(SafetyCheck(
            passed=pool_tvl >= config.min_pool_tvl,
            reason=f"Pool TVL ${pool_tvl} vs min ${config.min_pool_tvl}",
            check_name="pool_tvl_check",
        ))

    # CHECK 5: Oracle data freshness
    if oracle_timestamp:
        age = int(time.time()) - oracle_timestamp
        checks.append(SafetyCheck(
            passed=age <= config.oracle_max_age,
            reason=f"Oracle data age: {age}s vs max {config.oracle_max_age}s",
            check_name="oracle_freshness",
        ))

    # CHECK 6: Slippage within bounds (if applicable)
    slippage = float(action.get("estimated_slippage", 0))
    if slippage > 0:
        checks.append(SafetyCheck(
            passed=slippage <= config.max_slippage,
            reason=f"Slippage {slippage*100:.1f}% vs max {config.max_slippage*100:.1f}%",
            check_name="slippage_check",
        ))

    return checks


def all_checks_passed(checks: list[SafetyCheck]) -> bool:
    """Returns True only if ALL safety checks passed."""
    return all(c.passed for c in checks)


def get_failed_checks(checks: list[SafetyCheck]) -> list[SafetyCheck]:
    """Returns only the failed checks."""
    return [c for c in checks if not c.passed]
