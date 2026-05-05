# DecisionOS

**A Multi-Domain Benchmark for Evaluating AI Decision-Making Under Real-World Constraints**

This repository contains the complete, modernized DecisionOS system, optimized for research evaluation and hackathon presentations. It consists of a robust **FastAPI Backend** and an interactive, research-grade **React + Vite Frontend**.

## Features
- **Multi-Domain Evaluation:** Measures Decision Intelligence Score (DIS) across Task Prioritization, Resource Allocation, and Risk & Crisis Handling.
- **FastAPI Backend:** Fully typed, self-documenting JSON API running natively on Uvicorn.
- **Research Dashboard:** High-fidelity UI with step-by-step visualization, timeline explanations, domain tagging, and interactive agent comparison charts.

---

## 🚀 Quick Start Guide

### 1. Backend Setup

The backend handles the core environment, tasks, and agents.

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn server.app:app --reload --host 127.0.0.1 --port 7860
```
- **API URL:** `http://127.0.0.1:7860`
- **Swagger Docs:** `http://127.0.0.1:7860/docs`

### 2. Frontend Setup

The frontend provides the interactive dashboard. Open a new terminal:

```bash
cd frontend
npm install
npm run build
npm run dev
```
- **Dashboard URL:** `http://localhost:5173`

*(The frontend automatically connects to the backend at `127.0.0.1:7860` via `.env` configuration).*

---

## Testing the Full Demo Flow
1. Navigate to the **Dashboard** at `http://localhost:5173`.
2. Click **RESET ENVIRONMENT** to initialize the task queue and environment state.
3. Click **STEP** to prioritize active tasks and see the **Simulation Timeline** update with reasoning/explanations.
4. Click **RUN SIMULATION** to run the mock LLM agent through the entire timeline.
5. Click **COMPARE AGENTS** to view the performance bar charts and DIS metrics for all baseline agents.

---

## Architecture
- `backend/` -> Pure Python FastAPI application. Fully deterministic grading system without LLM-variance.
- `frontend/` -> React + Vite + TypeScript application powered by Tailwind CSS.

## License
MIT License
