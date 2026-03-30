"""
AeroFyta — Agent Runtime API Server

FastAPI + WebSocket server exposing all agent runtime capabilities:
  - Agent operations (listing, detail, reputation)
  - SLA management (listing, creation, evaluation)
  - Matching engine (provider discovery and ranking)
  - Market data (oracle prices, pool data, market context)
  - Real-time event streaming via WebSocket
"""

import os
import json
import time
import asyncio
import hashlib
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AeroFyta Agent Runtime",
    description="AI Agent Operations API — real-time monitoring, SLA management, reputation scoring",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global State ──────────────────────────────────────────────────

class ConnectionManager:
    """WebSocket connection manager for real-time broadcasting."""
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, data: dict):
        for conn in self.connections[:]:
            try:
                await conn.send_json(data)
            except Exception:
                self.connections.remove(conn)

manager = ConnectionManager()

# Initialize core engines
from core.reputation import ReputationEngine, create_demo_reputation_engine, OutcomeRecord
from core.matching import MatchingEngine, TaskSpec, ProviderCandidate, RiskTolerance, create_demo_candidates
from core.evaluator import QualityEvaluator
from core.oracle import OracleClient

reputation_engine = create_demo_reputation_engine()
oracle_client = OracleClient()
matching_engine = MatchingEngine(reputation_engine)
quality_evaluator = QualityEvaluator()


# ─── Request Models ────────────────────────────────────────────────

class MatchRequest(BaseModel):
    service_type: str
    budget: float
    deadline_hours: float
    risk_tolerance: str = "balanced"
    quality_threshold: float = 60.0

class EvaluateRequest(BaseModel):
    sla_id: int
    delivery: dict
    service_type: str = "data-analysis"
    deadline_hours: float = 1.0

class ExecuteTaskRequest(BaseModel):
    sla_id: int = 1
    task_spec: str = "Analyze InitiaDEX pool performance"


# ─── Health ────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "aerofyta-agent-runtime",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "websocket_connections": len(manager.connections),
        "reputation_agents": len(reputation_engine._agents),
    }


# ─── Agent Endpoints ───────────────────────────────────────────────

@app.get("/api/agents")
async def list_agents():
    """List all agents with reputation scores."""
    agents_data = reputation_engine.get_all_agents()

    # Enrich with additional data
    enriched = []
    for agent in agents_data:
        profile = reputation_engine.get_risk_profile(agent["agent_id"])
        enriched.append({
            **agent,
            "tier": profile["tier"],
            "tier_color": profile.get("tier_color", "#94a3b8"),
            "breach_rate": profile["breach_rate"],
            "overall_risk": profile["overall_risk"],
            "avg_quality": profile["avg_quality"],
        })

    return {"agents": enriched, "total": len(enriched)}


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: int):
    """Get detailed agent info with full reputation profile."""
    rep = reputation_engine.get_reputation(agent_id)
    if not rep:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    profile = reputation_engine.get_risk_profile(agent_id)
    return {
        "agent_id": rep.agent_id,
        "init_username": rep.init_username,
        "service_type": rep.service_type,
        "reputation": {
            "ema_score": round(rep.ema_score, 1),
            "success_rate": round(rep.success_rate, 1),
            "breach_rate": round(rep.breach_rate, 1),
            "quality_ema": round(rep.quality_ema, 1),
            "consistency_score": round(rep.consistency_score, 1),
            "time_reliability": round(rep.time_reliability_score, 1),
        },
        "profile": profile,
        "stats": {
            "total_slas": rep.total_slas,
            "settled_count": rep.settled_count,
            "breached_count": rep.breached_count,
            "total_volume": round(rep.total_volume, 2),
            "registered_at": rep.registered_at,
            "last_updated": rep.last_updated,
        },
        "recent_outcomes": rep.recent_outcomes[-10:],
        "recent_quality_scores": rep.recent_quality_scores[-10:],
    }


@app.get("/api/agents/{agent_id}/reputation")
async def get_agent_reputation(agent_id: int):
    """Get full reputation profile for an agent."""
    profile = reputation_engine.get_risk_profile(agent_id)
    rankings = reputation_engine.rank_providers(
        list(reputation_engine._agents.keys())
    )

    # Find this agent's rank
    rank = next(
        (i + 1 for i, r in enumerate(rankings) if r["agent_id"] == agent_id),
        None
    )

    return {
        "agent_id": agent_id,
        **profile,
        "rank": rank,
        "total_agents": len(rankings),
    }


# ─── SLA Endpoints ─────────────────────────────────────────────────

@app.get("/api/slas")
async def list_slas():
    """List all SLAs (demo data — would query chain in production)."""
    return {
        "slas": [
            {
                "id": 1, "clientAgent": "globex-buyer.init", "providerAgent": "acme-analyst.init",
                "serviceType": "data-analysis", "payment": "30", "slashPenalty": "15",
                "status": 3, "deadline": "2026-03-30 14:00", "createdAt": "2026-03-30 13:00",
            },
            {
                "id": 2, "clientAgent": "globex-buyer.init", "providerAgent": "acme-analyst.init",
                "serviceType": "data-analysis", "payment": "30", "slashPenalty": "15",
                "status": 5, "deadline": "2026-03-30 14:30", "createdAt": "2026-03-30 14:00",
            },
        ],
        "total": 2,
    }


# ─── Matching Endpoint ─────────────────────────────────────────────

@app.post("/api/match")
async def match_providers(req: MatchRequest):
    """
    Find and rank providers for a task using the matching engine.

    Returns scored and ranked providers with explanations.
    """
    task_spec = TaskSpec(
        service_type=req.service_type,
        description=f"Find providers for {req.service_type}",
        budget=req.budget,
        deadline_hours=req.deadline_hours,
        quality_threshold=req.quality_threshold,
    )

    candidates = create_demo_candidates()
    risk = RiskTolerance(req.risk_tolerance)
    matches = matching_engine.match_providers(task_spec, candidates, risk)

    results = []
    for m in matches:
        explanation = matching_engine.explain_match(m)
        results.append({
            "agent_id": m.agent_id,
            "init_username": m.init_username,
            "match_score": round(m.match_score, 1),
            "reputation_score": round(m.reputation_score, 1),
            "match_confidence": round(m.match_confidence, 2),
            "price_estimate": round(m.price_estimate, 2),
            "estimated_delivery_hours": round(m.estimated_delivery_hours, 2),
            "risk_score": round(m.risk_score, 1),
            "rank": m.rank,
            "explanation": explanation,
        })

    return {"matches": results, "total": len(results), "task": req.dict()}


# ─── Evaluation Endpoint ───────────────────────────────────────────

@app.post("/api/evaluate")
async def evaluate_delivery(req: EvaluateRequest):
    """
    Evaluate a delivery against SLA requirements and oracle data.

    Returns quality score, dimension breakdown, and recommendation.
    """
    oracle_data = None
    try:
        prices = await oracle_client.get_oracle_prices()
        pools = await oracle_client.get_dex_pools()
        oracle_data = {"prices": prices, "pools": pools}
    except Exception:
        pass

    sla_spec = {
        "service_type": req.service_type,
        "deadline_hours": req.deadline_hours,
    }

    result = quality_evaluator.evaluate(
        sla_id=req.sla_id,
        delivery=req.delivery,
        sla_spec=sla_spec,
        oracle_data=oracle_data,
        delivery_timestamp=time.time(),
        creation_timestamp=time.time() - (req.deadline_hours * 3600),
    )

    return {
        "sla_id": req.sla_id,
        "overall_score": round(result.overall_score, 1),
        "passed": result.passed,
        "recommendation": result.recommendation.value,
        "confidence": round(result.confidence, 2),
        "dimensions": {
            name: {
                "score": round(dim.score, 1),
                "max_score": dim.max_score,
                "percentage": round(dim.percentage, 1),
                "passed": dim.passed,
                "findings": dim.findings,
            }
            for name, dim in result.dimensions.items()
        },
        "evidence": result.evidence,
    }


# ─── Market Data Endpoints ─────────────────────────────────────────

@app.get("/api/market-context")
async def market_context():
    """Get comprehensive market context summary."""
    ctx = await oracle_client.get_market_context()
    return {
        "trend": ctx.trend,
        "volatility": ctx.volatility,
        "dominant_pair": ctx.dominant_pair,
        "total_tvl": ctx.total_tvl,
        "total_volume_24h": ctx.total_volume_24h,
        "avg_apy": ctx.avg_apy,
        "pool_count": ctx.pool_count,
        "data_freshness": ctx.data_freshness,
        "anomalies": ctx.anomalies,
        "timestamp": ctx.timestamp,
    }


@app.get("/api/oracle/prices")
async def oracle_prices():
    """Get latest oracle price feeds."""
    prices = await oracle_client.get_oracle_prices()
    return {"prices": prices, "fresh": oracle_client.is_data_fresh()}


@app.get("/api/oracle/pools")
async def oracle_pools():
    """Get InitiaDEX pool data with derived metrics."""
    pools = await oracle_client.get_dex_pools()
    return {"pools": pools, "total": len(pools)}


# ─── Revenue Endpoint ──────────────────────────────────────────────

@app.get("/api/revenue")
async def revenue():
    """Protocol revenue breakdown."""
    return {
        "fees": "0.15",
        "slashing": "3.00",
        "registration": "50.00",
        "total": "53.15",
        "slasSettled": 1,
        "slasBreached": 1,
        "sequencerGas": "0.02",
    }


# ─── Agent Execution ───────────────────────────────────────────────

@app.post("/api/execute")
async def execute_agent_task(req: ExecuteTaskRequest):
    """
    Execute an agent analysis task and broadcast results via WebSocket.
    """
    from agents.data_analyst import DataAnalystAgent

    analyst = DataAnalystAgent(
        agent_id=1,
        init_username="acme-analyst",
        oracle=oracle_client,
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
    )

    await manager.broadcast({
        "type": "sla_accepted",
        "agentName": "acme-analyst.init",
        "description": f"Executing SLA #{req.sla_id}: {req.task_spec}",
        "timestamp": time.time(),
    })

    try:
        result = await analyst.execute_analysis(
            sla_id=req.sla_id,
            task_spec=req.task_spec,
        )

        # Update reputation
        reputation_engine.record_outcome(
            OutcomeRecord(
                sla_id=req.sla_id,
                outcome="settled",
                quality_score=85.0,
                delivery_time_ratio=0.65,
                payment_amount=30.0,
            ),
            agent_id=1,
        )

        await manager.broadcast({
            "type": "sla_delivered",
            "agentName": "acme-analyst.init",
            "description": f"SLA #{req.sla_id} delivered | Model: {result['model_id']} | Hash: {result['output_hash'][:18]}...",
            "timestamp": time.time(),
        })

        return {
            "success": True,
            "sla_id": req.sla_id,
            "output_hash": result["output_hash"],
            "model_id": result["model_id"],
            "model_version": result["model_version"],
            "report": json.loads(result["output_json"]),
        }

    except Exception as e:
        await manager.broadcast({
            "type": "sla_failed",
            "agentName": "acme-analyst.init",
            "description": f"SLA #{req.sla_id} failed: {str(e)[:100]}",
            "timestamp": time.time(),
        })
        raise HTTPException(status_code=500, detail=str(e))


# ─── WebSocket ─────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data) if data else {}

            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong", "timestamp": time.time()})
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ─── Startup ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    print("=" * 60)
    print("  AeroFyta Agent Runtime v2.0.0")
    print("  Reputation Engine: loaded with demo data")
    print(f"  Agents tracked: {len(reputation_engine._agents)}")
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
