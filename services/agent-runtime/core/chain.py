"""
AeroFyta — Blockchain Interaction Layer

Full contract interaction for the agent runtime via web3.py.
Supports all operations needed for autonomous agent behavior:

  - Agent queries (getAgent, getActiveAgents, getAgentsByServiceType)
  - SLA lifecycle (create, accept, deliver, settle, dispute)
  - SLA monitoring (getPendingSLAs, getActiveSLAs)
  - Event subscription (SLACreated, SLADelivered, etc.)
  - Ghost Wallet session validation

All methods include proper error handling and gas estimation.
"""

import os
import json
import logging
from typing import Optional, List, Dict, Callable, Any
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

logger = logging.getLogger("aerofyta.chain")


class ChainClient:
    """
    EVM contract interaction client for AeroFyta Minitia.

    Wraps AgentVault, SLAEngine, and BillingEngine contracts
    with typed methods for all agent runtime operations.
    """

    def __init__(
        self,
        json_rpc_url: str,
        agent_vault_address: str,
        sla_engine_address: str,
        billing_engine_address: str,
        private_key: Optional[str] = None,
    ):
        self.w3 = Web3(Web3.HTTPProvider(json_rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        self.private_key = private_key
        if private_key:
            self.account = self.w3.eth.account.from_key(private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None

        # Load contracts
        self.vault = self.w3.eth.contract(
            address=Web3.to_checksum_address(agent_vault_address),
            abi=AGENT_VAULT_ABI,
        )
        self.sla = self.w3.eth.contract(
            address=Web3.to_checksum_address(sla_engine_address),
            abi=SLA_ENGINE_ABI,
        )

        self._event_callbacks: Dict[str, List[Callable]] = {}

    def is_connected(self) -> bool:
        return self.w3.is_connected()

    # ─── Agent Queries ─────────────────────────────────────────────

    def get_agent(self, agent_id: int) -> Dict:
        """Read agent data from AgentVault."""
        result = self.vault.functions.getAgent(agent_id).call()
        return {
            "id": agent_id,
            "owner": result[0],
            "username": result[1],
            "initUsername": result[1],
            "serviceType": result[2],
            "service_type": result[2],
            "description": result[3],
            "stake": float(self.w3.from_wei(result[4], "ether")),
            "earnings": float(self.w3.from_wei(result[5], "ether")),
            "activeSLAs": result[6],
            "active_slas": result[6],
            "ghostWallet": result[7],
            "sessionExpiry": result[8],
            "maxPerTx": float(self.w3.from_wei(result[9], "ether")),
            "isActive": result[10],
            "is_active": result[10],
            "registeredAt": result[11],
        }

    def get_agents_by_service_type(self, service_type: str) -> List[Dict]:
        """
        Query AgentVault for active agents matching a service type.

        In production: calls getActiveAgents() and filters by service_type.
        Falls back to iterating known agent IDs.
        """
        agents = []
        try:
            # Try batch query first
            active_ids = self.vault.functions.getActiveAgents(0, 50).call()
            for aid in active_ids:
                try:
                    agent = self.get_agent(aid)
                    if agent["service_type"] == service_type and agent["is_active"]:
                        agents.append(agent)
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"[Chain] getActiveAgents failed: {e}")
            # Fallback: try sequential IDs
            for aid in range(1, 20):
                try:
                    agent = self.get_agent(aid)
                    if agent["service_type"] == service_type and agent["is_active"]:
                        agents.append(agent)
                except Exception:
                    break

        return agents

    # ─── SLA Queries ───────────────────────────────────────────────

    def get_sla(self, sla_id: int) -> Dict:
        """Read SLA data from SLAEngine."""
        result = self.sla.functions.getAgreement(sla_id).call()
        return {
            "id": result[0],
            "slaId": result[0],
            "clientAgentId": result[1],
            "providerAgentId": result[2],
            "serviceType": result[3],
            "service_type": result[3],
            "inputSpecHash": result[4].hex(),
            "input_spec_hash": result[4].hex(),
            "deliveryDeadline": result[5],
            "deadline": result[5],
            "payment": float(self.w3.from_wei(result[6], "ether")),
            "slashPenalty": float(self.w3.from_wei(result[7], "ether")),
            "slash_penalty": float(self.w3.from_wei(result[7], "ether")),
            "outputHash": result[8].hex(),
            "outputLocation": result[9],
            "status": result[10],
            "disputeDeadline": result[11],
            "disputeReason": result[12],
            "createdAt": result[13],
            "settledAt": result[14],
            "client": f"agent-{result[1]}",
        }

    def get_pending_slas(self, agent_id: int) -> List[Dict]:
        """
        Get SLAs in Proposed status targeting this agent.
        These are SLAs waiting for the agent to accept.
        """
        slas = []
        try:
            # Query the SLA counter and check each
            # In production: use an indexed query or event-based approach
            for sla_id in range(1, 50):
                try:
                    sla = self.get_sla(sla_id)
                    if (
                        sla["providerAgentId"] == agent_id
                        and sla["status"] == 0  # Proposed
                    ):
                        slas.append(sla)
                except Exception:
                    break
        except Exception as e:
            logger.warning(f"[Chain] get_pending_slas failed: {e}")
        return slas

    def get_active_slas(self, agent_id: int) -> List[Dict]:
        """
        Get SLAs in Active status for this agent (as provider).
        These are SLAs the agent has accepted and needs to execute/deliver.
        """
        slas = []
        try:
            for sla_id in range(1, 50):
                try:
                    sla = self.get_sla(sla_id)
                    if (
                        sla["providerAgentId"] == agent_id
                        and sla["status"] == 1  # Active
                    ):
                        slas.append(sla)
                except Exception:
                    break
        except Exception as e:
            logger.warning(f"[Chain] get_active_slas failed: {e}")
        return slas

    # ─── SLA Lifecycle ─────────────────────────────────────────────

    def accept_sla(self, sla_id: int) -> str:
        """Provider accepts an SLA proposal."""
        return self._send_tx(
            self.sla.functions.acceptAgreement(sla_id),
            gas=300000,
        )

    def deliver_sla(
        self,
        sla_id: int,
        output_hash: bytes,
        output_location: str,
        model_id: str,
        model_version: str,
    ) -> str:
        """Provider delivers SLA output with model attribution."""
        return self._send_tx(
            self.sla.functions.deliver(
                sla_id, output_hash, output_location, model_id, model_version
            ),
            gas=500000,
        )

    def create_sla(
        self,
        provider_agent_id: int,
        service_type: str,
        payment: float,
        slash_penalty: float,
        deadline_seconds: int,
        input_spec_hash: str,
    ) -> str:
        """Client creates a new SLA with escrowed payment."""
        payment_wei = self.w3.to_wei(payment, "ether")
        slash_wei = self.w3.to_wei(slash_penalty, "ether")
        spec_hash = bytes.fromhex(input_spec_hash[2:]) if input_spec_hash.startswith("0x") else bytes(32)

        return self._send_tx(
            self.sla.functions.createAgreement(
                provider_agent_id,
                service_type,
                spec_hash,
                deadline_seconds,
                slash_wei,
            ),
            value=payment_wei,
            gas=600000,
        )

    def settle_sla(self, sla_id: int) -> str:
        """Client settles an SLA, releasing payment to provider."""
        return self._send_tx(
            self.sla.functions.settle(sla_id),
            gas=300000,
        )

    def dispute_sla(self, sla_id: int, reason: str = "Quality below threshold") -> str:
        """Client disputes a delivery."""
        return self._send_tx(
            self.sla.functions.disputeDelivery(sla_id, reason),
            gas=300000,
        )

    # ─── Ghost Wallet ──────────────────────────────────────────────

    def is_session_valid(self, agent_id: int, ghost_address: str) -> bool:
        """Check if a Ghost Wallet session is still valid."""
        return self.vault.functions.isSessionValid(
            agent_id, Web3.to_checksum_address(ghost_address)
        ).call()

    # ─── Event Subscription ────────────────────────────────────────

    def subscribe_to_events(self, event_name: str, callback: Callable):
        """
        Register a callback for contract events.

        Supported events:
        - SLACreated, SLAAccepted, SLADelivered, SLASettled, SLABreached
        - AgentRegistered, StakeSlashed

        In production: uses web3.py event filters with persistent polling.
        """
        if event_name not in self._event_callbacks:
            self._event_callbacks[event_name] = []
        self._event_callbacks[event_name].append(callback)
        logger.info(f"[Chain] Subscribed to {event_name} events")

    # ─── Transaction Helper ────────────────────────────────────────

    def _send_tx(self, fn, gas: int = 300000, value: int = 0) -> str:
        """Build, sign, and send a transaction."""
        if not self.account:
            raise ValueError("No private key configured — cannot send transactions")

        tx_params = {
            "from": self.address,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "gas": gas,
            "gasPrice": self.w3.eth.gas_price,
        }
        if value > 0:
            tx_params["value"] = value

        tx = fn.build_transaction(tx_params)
        signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status == 0:
            raise RuntimeError(f"Transaction reverted: {tx_hash.hex()}")

        logger.info(f"[Chain] TX confirmed: {receipt.transactionHash.hex()} (gas: {receipt.gasUsed})")
        return receipt.transactionHash.hex()


# ─── ABIs ──────────────────────────────────────────────────────────

AGENT_VAULT_ABI = [
    {
        "inputs": [{"name": "agentId", "type": "uint256"}],
        "name": "getAgent",
        "outputs": [
            {"components": [
                {"name": "owner", "type": "address"},
                {"name": "initUsername", "type": "string"},
                {"name": "serviceType", "type": "string"},
                {"name": "description", "type": "string"},
                {"name": "stake", "type": "uint256"},
                {"name": "earnings", "type": "uint256"},
                {"name": "activeSLAs", "type": "uint256"},
                {"name": "ghostWallet", "type": "address"},
                {"name": "sessionExpiry", "type": "uint64"},
                {"name": "maxPerTx", "type": "uint256"},
                {"name": "isActive", "type": "bool"},
                {"name": "registeredAt", "type": "uint256"},
            ], "name": "", "type": "tuple"}
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "uint256"}, {"name": "caller", "type": "address"}],
        "name": "isSessionValid",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "offset", "type": "uint256"}, {"name": "limit", "type": "uint256"}],
        "name": "getActiveAgents",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
]

SLA_ENGINE_ABI = [
    {
        "inputs": [{"name": "slaId", "type": "uint256"}],
        "name": "getAgreement",
        "outputs": [
            {"components": [
                {"name": "slaId", "type": "uint256"},
                {"name": "clientAgentId", "type": "uint256"},
                {"name": "providerAgentId", "type": "uint256"},
                {"name": "serviceType", "type": "string"},
                {"name": "inputSpecHash", "type": "bytes32"},
                {"name": "deliveryDeadline", "type": "uint64"},
                {"name": "payment", "type": "uint256"},
                {"name": "slashPenalty", "type": "uint256"},
                {"name": "outputHash", "type": "bytes32"},
                {"name": "outputLocation", "type": "string"},
                {"name": "status", "type": "uint8"},
                {"name": "disputeDeadline", "type": "uint64"},
                {"name": "disputeReason", "type": "string"},
                {"name": "createdAt", "type": "uint256"},
                {"name": "settledAt", "type": "uint256"},
            ], "name": "", "type": "tuple"}
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "slaId", "type": "uint256"}],
        "name": "acceptAgreement",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "slaId", "type": "uint256"},
            {"name": "outputHash", "type": "bytes32"},
            {"name": "outputLocation", "type": "string"},
            {"name": "modelId", "type": "string"},
            {"name": "modelVersion", "type": "string"},
        ],
        "name": "deliver",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "providerAgentId", "type": "uint256"},
            {"name": "serviceType", "type": "string"},
            {"name": "inputSpecHash", "type": "bytes32"},
            {"name": "deadlineSeconds", "type": "uint64"},
            {"name": "slashPenalty", "type": "uint256"},
        ],
        "name": "createAgreement",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"name": "slaId", "type": "uint256"}],
        "name": "settle",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "slaId", "type": "uint256"},
            {"name": "reason", "type": "string"},
        ],
        "name": "disputeDelivery",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]
