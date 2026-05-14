"""
Mock LLM Adapter
"""
from typing import Any, Dict, List

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action
from decisionos.adapters.base_adapter import BaseAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("mock_llm")
class MockLLMAdapter(BaseAdapter):
    def decide_action(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="[CoT] No active task. Flagging as precaution.")

        domain = task.domain_type

        if domain == "prioritization":
            return self._reason_prioritization(task, observation)
        elif domain == "resource_allocation":
            return self._reason_resource_allocation(task, observation)
        elif domain == "risk_crisis":
            return self._reason_risk_crisis(task, observation)
        else:
            return build_action("flag_risk", task_id=task.task_id, reason="[CoT] Unknown domain.")

    def _reason_prioritization(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        competing: List[Dict[str, Any]] = task.metadata.get("competing_tasks", [])
        urgency_weight = {"low": 1, "medium": 3, "high": 6, "critical": 10}

        scored = []
        for t in competing:
            u = urgency_weight.get(t.get("urgency", "low"), 1)
            imp = t.get("importance", 1)
            deadline = t.get("deadline_hours", 72)
            import math
            pressure = (u * imp) / (math.log(deadline + 1) + 0.01)
            scored.append((pressure, t))

        if not scored:
            return build_action(
                "prioritize_task",
                task_id=task.task_id,
                reason="[CoT] No competing tasks found. Prioritizing current task.",
            )

        best_pressure, best_task = max(scored, key=lambda x: x[0])
        cot_trace = (
            f"[CoT] Evaluated {len(scored)} competing tasks using "
            f"pressure = urgency_weight × importance / log(deadline+1). "
            f"Highest pressure: {best_task['task_id']} "
            f"(urgency={best_task.get('urgency')}, "
            f"importance={best_task.get('importance')}, "
            f"deadline={best_task.get('deadline_hours')}h, "
            f"score={best_pressure:.2f}). "
            f"Action: prioritize_task on {best_task['task_id']}."
        )

        return build_action(
            "prioritize_task",
            task_id=best_task["task_id"],
            reason=cot_trace,
        )

    def _reason_resource_allocation(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        projects: List[Dict[str, Any]] = task.metadata.get("projects", [])
        total_budget = task.metadata.get("total_budget", obs.available_budget)

        allocated: Dict[str, float] = {}
        remaining = total_budget
        for p in projects:
            allocated[p["project_id"]] = p["min_budget"]
            remaining -= p["min_budget"]

        total_roi = sum(p["roi_score"] for p in projects)
        for p in projects:
            share = (p["roi_score"] / total_roi) * remaining
            allocated[p["project_id"]] += share

        for p in projects:
            allocated[p["project_id"]] = min(allocated[p["project_id"]], p["max_budget"])

        final_total = sum(allocated.values())
        cot_trace = (
            f"[CoT] Resource allocation reasoning: "
            f"Total budget=${total_budget:.0f}. "
            f"Minimums satisfied: {', '.join(f'{k}=${v:.0f}' for k, v in allocated.items())}. "
            f"Surplus distributed proportionally by ROI. "
            f"Final allocation total=${final_total:.0f}. "
            f"Action: allocate_resources with amount={final_total:.0f}."
        )

        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(final_total, 2),
            reason=cot_trace,
        )

    def _reason_risk_crisis(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        alert = task.metadata.get("alert", {})
        ml_score = alert.get("ml_fraud_score", 0.0)
        total_value = alert.get("total_value_usd", 0)
        geo_anomaly = alert.get("geographic_anomaly", False)
        velocity = alert.get("velocity_breach", False)
        accounts = alert.get("affected_accounts", 1)
        account_ages = alert.get("account_age_days", [])

        high_ml = ml_score > 0.85
        high_value = total_value > 50_000
        multi_account = accounts > 1
        new_account = any(age < 30 for age in account_ages)

        cot_lines = [
            f"[CoT] Fraud risk assessment:",
            f"  ML fraud score: {ml_score:.2f} → {'HIGH' if high_ml else 'MODERATE'}",
            f"  Transaction value: ${total_value:,} → {'HIGH' if high_value else 'LOW'}",
            f"  Geographic anomaly: {geo_anomaly}",
            f"  Velocity breach: {velocity}",
            f"  Affected accounts: {accounts} (new <30d: {new_account})",
        ]

        if high_ml and high_value and multi_account:
            cot_lines.append("  → ALL three critical flags active. DECISION: escalate_issue to fraud review team.")
            action_type = "escalate_issue"
        elif high_ml:
            cot_lines.append("  → High ML score only. Reject transaction as precaution. DECISION: reject_decision.")
            action_type = "reject_decision"
        elif geo_anomaly or velocity:
            cot_lines.append("  → Anomaly signals present but ML score borderline. DECISION: flag_risk for analyst review.")
            action_type = "flag_risk"
        else:
            cot_lines.append("  → Risk signals insufficient. DECISION: approve_decision.")
            action_type = "approve_decision"

        return build_action(action_type, task_id=task.task_id, reason=" | ".join(cot_lines))

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Mock LLM Base",
            "type": "Native",
            "reasoning_style": "Generative CoT Simulation",
            "risk_profile": "Balanced / Safe",
            "optimization_focus": "Contextual Alignment",
            "stability_rating": "High",
            "benchmark_compatibility": "Native",
            "description": "Simulates structured chain-of-thought reasoning without requiring API keys."
        }
