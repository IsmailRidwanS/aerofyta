"""
AeroFyta — Agent Runtime API Server
FastAPI + WebSocket for real-time agent activity broadcasting.
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AeroFyta Agent Runtime",
    description="AI Agent Operations API — real-time agent monitoring and SLA management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


# ============ REST Endpoints ============

@app.get("/")
async def root():
    return {
        "protocol": "AeroFyta",
        "version": "1.0.0",
        "chain_id": "aerofyta-1",
        "description": "On-chain operations & settlement layer for enterprise AI agents",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ai_model": "claude-sonnet-4",
        "ai_status": "available",
    }


@app.get("/api/agents")
async def list_agents():
    """Get all registered agents (from on-chain data)."""
    # TODO: Query AgentVault contract via web3
    return {
        "agents": [
            {
                "id": 1,
                "init_username": "acme-analyst.init",
                "service_type": "data-analysis",
                "stake": "200",
                "earnings": "29.85",
                "active_slas": 0,
                "is_active": True,
                "performance_score": 50.0,
            },
            {
                "id": 2,
                "init_username": "globex-buyer.init",
                "service_type": "procurement",
                "stake": "100",
                "earnings": "42",
                "active_slas": 0,
                "is_active": True,
                "performance_score": 100.0,
            },
        ],
        "total": 2,
    }


@app.get("/api/slas")
async def list_slas():
    """Get all SLAs (from on-chain data)."""
    # TODO: Query SLAEngine contract via web3
    return {
        "slas": [
            {
                "id": 1,
                "client_agent": "globex-buyer.init",
                "provider_agent": "acme-analyst.init",
                "service_type": "data-analysis",
                "payment": "30",
                "status": "settled",
            },
            {
                "id": 2,
                "client_agent": "globex-buyer.init",
                "provider_agent": "acme-analyst.init",
                "service_type": "data-analysis",
                "payment": "30",
                "status": "breached",
            },
        ],
        "total": 2,
    }


@app.get("/api/revenue")
async def get_revenue():
    """Get protocol revenue breakdown (from on-chain data)."""
    # TODO: Query BillingEngine contract via web3
    return {
        "fee_revenue": "0.15",
        "slash_revenue": "3.00",
        "registration_revenue": "50.00",
        "total_revenue": "53.15",
        "slas_settled": 1,
        "slas_breached": 1,
    }


@app.post("/api/agents/{agent_id}/execute")
async def execute_agent_task(agent_id: int, task: dict = None):
    """Trigger an agent to execute an analysis task."""
    # Import here to avoid circular deps
    from agents.data_analyst import DataAnalystAgent
    from core.oracle import OracleClient

    oracle = OracleClient(
        rpc_url=os.getenv("RPC_URL", "http://localhost:26657"),
        rest_url=os.getenv("REST_URL", "http://localhost:1317"),
    )

    agent = DataAnalystAgent(
        agent_id=agent_id,
        init_username=f"agent-{agent_id}.init",
        oracle=oracle,
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
    )

    task_spec = (task or {}).get("spec", "Analyze InitiaDEX pool performance for moderate-risk allocation")

    # Broadcast: agent is working
    await manager.broadcast({
        "type": "agent_action",
        "agent_id": agent_id,
        "action": "executing",
        "description": f"Fetching data and running analysis...",
        "timestamp": datetime.utcnow().isoformat(),
    })

    # Execute analysis
    result = await agent.execute_analysis(sla_id=0, task_spec=task_spec)

    # Broadcast: analysis complete
    await manager.broadcast({
        "type": "analysis_complete",
        "agent_id": agent_id,
        "report": result["report"],
        "output_hash": result["output_hash"],
        "model_id": result["model_id"],
        "timestamp": datetime.utcnow().isoformat(),
    })

    await oracle.close()

    return {
        "status": "completed",
        "report": result["report"],
        "output_hash": result["output_hash"],
        "model_id": result["model_id"],
        "model_version": result["model_version"],
        "data_points": result["total_data_points"],
    }


# ============ WebSocket ============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Echo or handle client commands
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ============ Main ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
