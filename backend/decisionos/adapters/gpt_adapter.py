"""
GPT-Style Simulated Adapter
"""
from typing import Any, Dict

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action
from decisionos.adapters.mock_llm_adapter import MockLLMAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("gpt_style")
class GPTAdapter(MockLLMAdapter):
    """
    Simulates GPT's reasoning style: balanced reasoning,
    moderate resource efficiency, adaptive prioritization.
    """

    def _reason_resource_allocation(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        # Tends to allocate exactly the required amount without optimizing heavily
        total_budget = task.budget_required or (obs.available_budget * 0.4)
        amount = min(total_budget, obs.available_budget)
        
        cot_trace = (
            f"[GPT-CoT] Resource allocation analysis: "
            f"Requested budget is ${total_budget:.0f}. "
            f"Allocating strictly to cover required minimums to conserve overall budget. "
            f"Action: allocate_resources with amount={amount:.0f}."
        )

        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(amount, 2),
            reason=cot_trace,
        )

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "GPT-Style Reasoning",
            "type": "Simulated External",
            "reasoning_style": "Balanced Analytical",
            "risk_profile": "Moderate",
            "optimization_focus": "Task Throughput",
            "stability_rating": "High",
            "benchmark_compatibility": "Experimental",
            "description": "Simulated balanced reasoning, moderate resource efficiency, adaptive prioritization."
        }
