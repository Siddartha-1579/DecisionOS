"""
Rule Based Adapter
"""
from typing import Any, Dict

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action
from decisionos.adapters.base_adapter import BaseAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("rule_based")
class RuleBasedAdapter(BaseAdapter):
    def decide_action(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="No current task.")

        domain = task.domain_type

        if domain == "prioritization":
            return self._handle_prioritization(task, observation)
        elif domain == "resource_allocation":
            return self._handle_resource_allocation(task, observation)
        elif domain == "risk_crisis":
            return self._handle_risk_crisis(task, observation)
        else:
            return build_action("flag_risk", task_id=task.task_id, reason="Unknown domain.")

    def _handle_prioritization(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        competing = task.metadata.get("competing_tasks", [])
        critical = [t for t in competing if t.get("urgency") == "critical"]

        if critical:
            best = max(critical, key=lambda t: t.get("importance", 0))
            return build_action(
                "prioritize_task",
                task_id=best["task_id"],
                reason=(
                    f"Rule: urgency=critical + importance={best.get('importance')} "
                    f"triggers immediate prioritization."
                ),
            )

        if competing:
            best = max(competing, key=lambda t: t.get("importance", 0))
            return build_action(
                "prioritize_task",
                task_id=best["task_id"],
                reason=f"Rule: highest importance task selected ({best.get('importance')}).",
            )

        return build_action(
            "prioritize_task",
            task_id=task.task_id,
            reason="Rule: default prioritize current task.",
        )

    def _handle_resource_allocation(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        total = task.metadata.get("total_budget", task.budget_required)
        available = obs.available_budget
        amount = min(total, available)
        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(amount, 2),
            reason=(
                f"Rule: allocate full sprint budget ${amount:.0f} "
                f"(available: ${available:.0f}, optimal target: ${total:.0f})."
            ),
        )

    def _handle_risk_crisis(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        risk = task.risk_level
        if risk > 0.7:
            return build_action(
                "escalate_issue",
                task_id=task.task_id,
                reason=(
                    f"Rule: risk_level={risk:.2f} exceeds 0.70 threshold "
                    f"→ escalate to human fraud review team."
                ),
            )
        elif risk > 0.4:
            return build_action(
                "flag_risk",
                task_id=task.task_id,
                reason=f"Rule: risk_level={risk:.2f} is moderate → flag for review.",
            )
        else:
            return build_action(
                "approve_decision",
                task_id=task.task_id,
                reason=f"Rule: risk_level={risk:.2f} is low → approve.",
            )

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Rule-Based Heuristic",
            "type": "Native",
            "reasoning_style": "Deterministic Trees",
            "risk_profile": "Rigid / Rule-Bound",
            "optimization_focus": "Task Completion",
            "stability_rating": "Moderate",
            "benchmark_compatibility": "Native",
            "description": "Applies explicit hand-crafted heuristics per domain."
        }
