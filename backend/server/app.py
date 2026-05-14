"""
DecisionOS FastAPI Application
All API routes, CORS headers, and JSON responses.
"""
from __future__ import annotations
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from decisionos.environment import DecisionEnv
from decisionos.agents import RandomAgent, RuleBasedAgent, MockLLMAgent
from decisionos.tasks import TASK_REGISTRY, DOMAINS
from decisionos.schemas import _asdict

app = FastAPI(title="DecisionOS", version="1.0.0")

# ── Shared environment instance (single-user prototype) ──────────────────────
_env: DecisionEnv = DecisionEnv()

# ── CORS middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://decision-os-one-sandy.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

def _json(data: dict, status_code: int = 200) -> JSONResponse:
    """Return a JSON response from a dict (handles nested dataclasses)."""
    return JSONResponse(content=_asdict(data), status_code=status_code)

# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return _json({
        "status": "ok",
        "project": "DecisionOS",
        "version": "1.0.0",
        "description": (
            "A Multi-Domain Benchmark for Evaluating AI Decision-Making "
            "Under Real-World Constraints. Measures Decision Intelligence Score (DIS) "
            "across Task Prioritization, Resource Allocation, and Risk & Crisis Handling."
        ),
        "endpoints": [
            "GET  /              — health check",
            "POST /reset         — reset environment",
            "GET  /state         — current state",
            "POST /step          — take an action",
            "POST /simulate/<agent_name>  — run full simulation (random|rule_based|mock_llm)",
            "GET  /compare-agents — compare all 3 agents",
            "GET  /domains        — available domains",
            "GET  /tasks         — task definitions",
            "GET  /metrics       — current metrics",
            "GET  /docs          — this endpoint list",
        ],
    })

@app.post("/reset")
async def reset_environment(request: Request):
    try:
        body = await request.json()
        domain = body.get("domain", "Operations")
    except Exception:
        domain = "Operations"
        
    observation = _env.reset(domain)
    metrics = _env.get_metrics()
    return _json({
        "observation": observation.model_dump(),
        "metrics": metrics,
    })

@app.get("/state")
def get_state():
    observation = _env.get_observation()
    metrics = _env.get_metrics()
    return _json({
        "observation": observation.model_dump(),
        "metrics": metrics,
    })

@app.post("/step")
async def step(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
        
    if not body or "action_type" not in body:
        return _json({"error": "Request body must be JSON with an action_type field."}, 400)
        
    try:
        result = _env.step(body)
    except ValueError as exc:
        return _json({"error": str(exc)}, 400)
        
    return _json({
        "observation": result["observation"].model_dump(),
        "reward": result["reward"],
        "done": result["done"],
        "info": result["info"],
        "metrics": result["metrics"],
        "dis": result["dis"].model_dump(),
    })

@app.post("/simulate/{agent_name}")
async def simulate(agent_name: str, request: Request):
    try:
        body = await request.json()
        domain = body.get("domain", _env.active_domain)
    except Exception:
        domain = _env.active_domain

    from decisionos.adapters import AgentRegistry
    if agent_name not in AgentRegistry._adapters:
        return _json({
            "error": f"Agent '{agent_name}' not found.",
            "valid": list(AgentRegistry._adapters.keys()),
        }, 404)
    env = DecisionEnv()
    agent = AgentRegistry.get_agent(agent_name)
    result = env.run_agent(agent, domain)
    return _json(result)

@app.get("/compare-agents")
def compare_agents():
    from decisionos.adapters import AgentRegistry
    agents = []
    for name in AgentRegistry._adapters:
        agents.append((name, AgentRegistry.get_agent(name)))

    results = []
    current_domain = _env.active_domain
    for name, agent in agents:
        env = DecisionEnv()
        run = env.run_agent(agent, current_domain)
        results.append({
            "agent_name": name,
            "final_dis": run["final_dis"],
            "total_reward": run["total_reward"],
            "completed_tasks": run["completed_tasks"],
            "risk_failures": run["risk_failures"],
            "steps_used": run["steps_used"],
            "component_scores": run["component_scores"],
        })
    results.sort(key=lambda x: x["final_dis"], reverse=True)
    return _json({
        "comparison": results,
        "winner": results[0]["agent_name"] if results else None,
        "note": f"Evaluated on {current_domain} domain.",
    })

@app.get("/adapters")
def get_adapters():
    from decisionos.adapters import AgentRegistry
    return _json({"adapters": AgentRegistry.get_all_metadata()})

@app.get("/domains")
def get_domains():
    descriptions = {
        "Operations": "Core business infrastructure handling.",
        "Finance": "Managing budgets and fraud protection.",
        "Healthcare": "Hospital triage and emergency resource allocation.",
        "Cybersecurity": "Network defense and incident response.",
        "Logistics": "Supply chain routing and crisis management."
    }
    return _json({"domains": list(DOMAINS.keys()), "descriptions": descriptions})

@app.get("/tasks")
def list_tasks():
    return _json({"tasks": [t.model_dump() for t in TASK_REGISTRY]})

@app.get("/metrics")
def get_metrics():
    return _json(_env.get_metrics())
