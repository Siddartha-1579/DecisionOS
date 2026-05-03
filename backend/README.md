# DecisionOS

**A Multi-Domain Benchmark for Evaluating AI Decision-Making Under Real-World Constraints**

---

## Overview

DecisionOS is a research-grade backend benchmark environment that measures **Decision Intelligence** in AI agents across three progressively harder real-world domains:

| # | Domain | Difficulty | Scenario |
|---|--------|------------|----------|
| 1 | Task Prioritization | Easy | Which incident to handle first under deadline pressure? |
| 2 | Resource Allocation | Medium | How to distribute a $20k sprint budget optimally? |
| 3 | Risk & Crisis Handling | Hard | Should a $184k fraud cluster be approved, rejected, or escalated? |

The benchmark produces a **Decision Intelligence Score (DIS)** — a normalized 0.0–1.0 composite metric — giving researchers a single interpretable number to compare agents, policies, and model versions.

---

## Research Motivation

Most LLM benchmarks test factual recall or reasoning on closed-form problems (math, coding, QA). DecisionOS fills a gap: **sequential, constraint-driven, real-world decision-making**.

Key contributions:
- **Multi-domain evaluation** spanning operational, financial, and crisis domains
- **Deterministic, reproducible grading** — no LLM-judge variance
- **Reward shaping** that reflects real consequences (ignoring fraud = large penalty)
- **Baseline agent ladder** from Random → Rule-Based → MockLLM to anchor performance
- **REST API** for frontend, notebook, or automated CI integration

---

## Installation

```bash
git clone https://github.com/your-org/decisionos-backend
cd decisionos-backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Running the Server

```bash
python run.py
```

Server starts at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## API Endpoints

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check + project description |
| GET | `/docs` | Swagger UI |

### Environment

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reset` | Reset environment, return initial observation |
| GET | `/state` | Current observation + metrics |
| POST | `/step` | Submit an action, receive reward + DIS |
| GET | `/tasks` | All task definitions |
| GET | `/metrics` | Current episode metrics |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/simulate/{agent_name}` | Run full episode (`random`, `rule_based`, `mock_llm`) |
| GET | `/compare-agents` | Run all 3 agents, return comparison table |

---

## Action Space

```json
{
  "action_type": "prioritize_task",
  "task_id": "T1B",
  "amount": null,
  "reason": "Critical urgency + highest importance"
}
```

Valid `action_type` values:

| Action | Use When |
|--------|----------|
| `prioritize_task` | Promote a task to top of queue |
| `delay_task` | Defer a lower-priority task |
| `allocate_resources` | Assign budget/time to a task (requires `amount`) |
| `approve_decision` | Accept a request/transaction |
| `reject_decision` | Decline a request/transaction |
| `escalate_issue` | Route to human/senior review |
| `flag_risk` | Mark for later review without action |

---

## Decision Intelligence Score (DIS)

DIS is a weighted composite of five grader components, each scored 0.0–1.0:

| Component | Weight | Measures |
|-----------|--------|----------|
| decision_correctness | 35% | Did the agent choose the right action type? |
| resource_efficiency | 20% | Was budget/time/workforce used optimally? |
| risk_handling_accuracy | 25% | Was the risk severity matched correctly? |
| task_completion | 12% | Did the action resolve the task? |
| step_efficiency | 8% | Did the agent act without wasted steps? |

**DIS Tiers:**

| Range | Tier |
|-------|------|
| 0.90–1.00 | ELITE |
| 0.75–0.89 | PROFICIENT |
| 0.55–0.74 | DEVELOPING |
| 0.35–0.54 | NOVICE |
| 0.00–0.34 | POOR |

---

## Sample curl Commands

### Reset environment
```bash
curl -X POST http://localhost:8000/reset
```

### Submit an action
```bash
curl -X POST http://localhost:8000/step \
  -H "Content-Type: application/json" \
  -d '{"action_type": "prioritize_task", "task_id": "T1B", "reason": "Critical DB outage"}'
```

### Run MockLLM agent
```bash
curl -X POST http://localhost:8000/simulate/mock_llm
```

### Compare all agents
```bash
curl http://localhost:8000/compare-agents
```

### List tasks
```bash
curl http://localhost:8000/tasks
```

---

## Baseline Agent Results (Expected)

| Agent | DIS | Total Reward | Notes |
|-------|-----|-------------|-------|
| `random` | ~0.22 | ~-0.8 | Random action selection |
| `rule_based` | ~0.63 | ~0.3 | Heuristic rules per domain |
| `mock_llm` | ~0.87 | ~0.7 | Simulated chain-of-thought reasoning |

---

## Project Structure

```
decisionos-backend/
├── README.md
├── requirements.txt
├── run.py                    ← Entry point
├── server/
│   ├── __init__.py
│   └── app.py               ← FastAPI routes
└── decisionos/
    ├── __init__.py
    ├── schemas.py            ← Pydantic models
    ├── tasks.py              ← 3 benchmark task definitions
    ├── actions.py            ← Action space + validation
    ├── graders.py            ← Deterministic domain graders
    ├── metrics.py            ← DIS computation
    ├── environment.py        ← DecisionEnv (reset/step/run_agent)
    ├── agents.py             ← RandomAgent, RuleBasedAgent, MockLLMAgent
    └── simulator.py          ← Batch simulation utilities
```

---

## Why DecisionOS for AI Research?

1. **Reproducibility** — Deterministic graders mean zero variance across runs with the same agent.
2. **Interpretability** — DIS decomposes into 5 named components; researchers can identify exactly where an agent fails.
3. **Scalability** — New domains and tasks can be added by extending `TASK_REGISTRY` and `GRADER_MAP`.
4. **Framework-agnostic** — Any agent (LLM, RL policy, human) that produces JSON actions can be evaluated.
5. **Deployable** — REST API enables notebook, frontend, and CI pipeline integration out of the box.

---

## License

MIT — see LICENSE for details.
