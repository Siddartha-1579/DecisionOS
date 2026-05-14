"""
Random Adapter
"""
import random
from typing import Any, Dict

from decisionos.schemas import ObservationSchema
from decisionos.actions import build_action, DOMAIN_ACTIONS
from decisionos.adapters.base_adapter import BaseAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("random")
class RandomAdapter(BaseAdapter):
    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)

    def decide_action(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="No task — fallback flag.")

        domain = task.domain_type
        compatible = DOMAIN_ACTIONS.get(domain, list(DOMAIN_ACTIONS.keys()))
        chosen_action = self._rng.choice(compatible)

        kwargs: Dict[str, Any] = {
            "task_id": task.task_id,
            "reason": f"RandomAdapter: selected '{chosen_action}' at random.",
        }
        if chosen_action == "allocate_resources":
            # Random amount between 10% and 120% of budget_required
            budget = task.budget_required or observation.available_budget * 0.5
            kwargs["amount"] = round(self._rng.uniform(budget * 0.10, budget * 1.20), 2)

        return build_action(chosen_action, **kwargs)

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Random Baseline",
            "type": "Native",
            "reasoning_style": "Stochastic",
            "risk_profile": "Unpredictable",
            "optimization_focus": "None",
            "stability_rating": "Low",
            "benchmark_compatibility": "Native",
            "description": "Selects uniformly at random from domain-compatible actions."
        }
