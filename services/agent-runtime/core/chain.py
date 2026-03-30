"""
AeroFyta — Blockchain Interaction Layer
Handles EVM contract calls via web3.py for the agent runtime.
"""

import os
import json
from typing import Optional
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware


class ChainClient:
    """Interacts with AeroFyta Minitia EVM contracts."""

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

        # Load ABIs (minimal for agent operations)
        self.vault = self.w3.eth.contract(
            address=Web3.to_checksum_address(agent_vault_address),
            abi=AGENT_VAULT_ABI,
        )
        self.sla = self.w3.eth.contract(
            address=Web3.to_checksum_address(sla_engine_address),
            abi=SLA_ENGINE_ABI,
        )

    def is_connected(self) -> bool:
        return self.w3.is_connected()

    def get_agent(self, agent_id: int) -> dict:
        """Read agent data from AgentVault."""
        result = self.vault.functions.getAgent(agent_id).call()
        return {
            "owner": result[0],
            "initUsername": result[1],
            "serviceType": result[2],
            "description": result[3],
            "stake": self.w3.from_wei(result[4], "ether"),
            "earnings": self.w3.from_wei(result[5], "ether"),
            "activeSLAs": result[6],
            "ghostWallet": result[7],
            "sessionExpiry": result[8],
            "maxPerTx": self.w3.from_wei(result[9], "ether"),
            "isActive": result[10],
            "registeredAt": result[11],
        }

    def get_sla(self, sla_id: int) -> dict:
        """Read SLA data from SLAEngine."""
        result = self.sla.functions.getAgreement(sla_id).call()
        return {
            "slaId": result[0],
            "clientAgentId": result[1],
            "providerAgentId": result[2],
            "serviceType": result[3],
            "inputSpecHash": result[4].hex(),
            "deliveryDeadline": result[5],
            "payment": self.w3.from_wei(result[6], "ether"),
            "slashPenalty": self.w3.from_wei(result[7], "ether"),
            "outputHash": result[8].hex(),
            "outputLocation": result[9],
            "status": result[10],
            "disputeDeadline": result[11],
            "disputeReason": result[12],
            "createdAt": result[13],
            "settledAt": result[14],
        }

    def accept_sla(self, sla_id: int) -> str:
        """Provider accepts an SLA."""
        if not self.account:
            raise ValueError("No private key configured")

        tx = self.sla.functions.acceptAgreement(sla_id).build_transaction({
            "from": self.address,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "gas": 300000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()

    def deliver_sla(
        self,
        sla_id: int,
        output_hash: bytes,
        output_location: str,
        model_id: str,
        model_version: str,
    ) -> str:
        """Provider delivers SLA output."""
        if not self.account:
            raise ValueError("No private key configured")

        tx = self.sla.functions.deliver(
            sla_id, output_hash, output_location, model_id, model_version
        ).build_transaction({
            "from": self.address,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "gas": 500000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()

    def is_session_valid(self, agent_id: int, ghost_address: str) -> bool:
        """Check if a Ghost Wallet session is still valid."""
        return self.vault.functions.isSessionValid(
            agent_id, Web3.to_checksum_address(ghost_address)
        ).call()


# Minimal ABIs for agent runtime (read + write functions needed)
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
]
