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
from decisionos.tasks import TASK_REGISTRY
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
        "http://127.0.0.1:3000"
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
            "GET  /tasks         — task definitions",
            "GET  /metrics       — current metrics",
            "GET  /docs          — this endpoint list",
        ],
    })

@app.post("/reset")
def reset_environment():
    observation = _env.reset()
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
def simulate(agent_name: str):
    agent_map = {
        "random": RandomAgent,
        "rule_based": RuleBasedAgent,
        "mock_llm": MockLLMAgent,
    }
    if agent_name not in agent_map:
        return _json({
            "error": f"Agent '{agent_name}' not found.",
            "valid": list(agent_map.keys()),
        }, 404)
    env = DecisionEnv()
    result = env.run_agent(agent_map[agent_name]())
    return _json(result)

@app.get("/compare-agents")
def compare_agents():
    agents = [
        ("random", RandomAgent()),
        ("rule_based", RuleBasedAgent()),
        ("mock_llm", MockLLMAgent()),
    ]
    results = []
    for name, agent in agents:
        env = DecisionEnv()
        run = env.run_agent(agent)
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
        "winner": results[0]["agent_name"],
        "note": "Higher DIS = better decision intelligence. MockLLM simulates structured reasoning.",
    })

@app.get("/tasks")
def list_tasks():
    return _json({"tasks": [t.model_dump() for t in TASK_REGISTRY]})

@app.get("/metrics")
def get_metrics():
    return _json(_env.get_metrics())
