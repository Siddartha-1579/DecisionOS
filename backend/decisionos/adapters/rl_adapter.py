"""
RL-Style Simulated Adapter
"""
from typing import Any, Dict

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action
from decisionos.adapters.base_adapter import BaseAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("rl_policy")
class RLAdapter(BaseAdapter):
    """
    Simulates an RL policy agent: reward-optimization focused,
    aggressive optimization behavior, occasionally unstable under cascading risk.
    """

    def decide_action(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("step", reason="No task, stepping to progress time.")

        domain = task.domain_type

        if domain == "prioritization":
            return self._handle_prioritization(task, observation)
        elif domain == "resource_allocation":
            return self._handle_resource_allocation(task, observation)
        elif domain == "risk_crisis":
            return self._handle_risk_crisis(task, observation)
        else:
            return build_action("step", task_id=task.task_id, reason="Fallback step.")

    def _handle_prioritization(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        # Always prioritize the highest importance task, ignoring urgency (aggressive optimization)
        competing = task.metadata.get("competing_tasks", [])
        if competing:
            best = max(competing, key=lambda t: t.get("importance", 0))
            return build_action(
                "prioritize_task",
                task_id=best["task_id"],
                reason=f"[RL Policy] Prioritized highest intrinsic reward task ({best.get('importance')}).",
            )
        return build_action(
            "prioritize_task",
            task_id=task.task_id,
            reason="[RL Policy] Prioritized current task.",
        )

    def _handle_resource_allocation(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        # Aggressive allocation: Dump all available budget into current task if it maximizes immediate reward
        total = task.metadata.get("total_budget", task.budget_required)
        amount = obs.available_budget  # Risky! Spends everything.
        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(amount, 2),
            reason=f"[RL Policy] Maximizing allocation for immediate reward (${amount:.0f}).",
        )

    def _handle_risk_crisis(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        # Ignores moderate risk to push for task completion reward
        risk = task.risk_level
        if risk > 0.9:  # Only escalates on extreme risk
            return build_action(
                "escalate_issue",
                task_id=task.task_id,
                reason="[RL Policy] Risk threshold exceeded (0.9). Escalating.",
            )
        else:
            return build_action(
                "approve_decision",
                task_id=task.task_id,
                reason="[RL Policy] Approving to collect task completion reward, ignoring moderate risk.",
            )

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "RL Policy Net",
            "type": "Simulated External",
            "reasoning_style": "Reward Maximization",
            "risk_profile": "Aggressive",
            "optimization_focus": "Immediate Returns",
            "stability_rating": "Volatile",
            "benchmark_compatibility": "Experimental",
            "description": "Simulated RL agent focusing on reward optimization, occasionally unstable."
        }
