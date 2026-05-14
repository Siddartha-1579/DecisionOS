"""
Claude-Style Simulated Adapter
"""
from typing import Any, Dict

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action
from decisionos.adapters.mock_llm_adapter import MockLLMAdapter
from decisionos.adapters.registry import AgentRegistry

@AgentRegistry.register("claude_style")
class ClaudeAdapter(MockLLMAdapter):
    """
    Simulates Claude's reasoning style: cautious, stronger risk avoidance,
    frequent escalations under uncertainty.
    """
    
    def _reason_risk_crisis(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        alert = task.metadata.get("alert", {})
        ml_score = alert.get("ml_fraud_score", 0.0)
        total_value = alert.get("total_value_usd", 0)
        geo_anomaly = alert.get("geographic_anomaly", False)
        
        # Lower thresholds for caution
        high_ml = ml_score > 0.60 
        high_value = total_value > 20_000
        
        cot_lines = [
            f"[Claude-CoT] Evaluating risk with high caution.",
            f"  ML fraud score: {ml_score:.2f} → {'ELEVATED' if high_ml else 'NOMINAL'}",
            f"  Transaction value: ${total_value:,} → {'SIGNIFICANT' if high_value else 'LOW'}",
            f"  Geographic anomaly: {geo_anomaly}",
        ]

        if high_ml or high_value or geo_anomaly:
            cot_lines.append("  → Any anomaly warrants caution. DECISION: escalate_issue for human oversight.")
            action_type = "escalate_issue"
        else:
            cot_lines.append("  → Risk appears minimal. DECISION: approve_decision.")
            action_type = "approve_decision"

        return build_action(action_type, task_id=task.task_id, reason=" | ".join(cot_lines))

    def _reason_prioritization(self, task: TaskSchema, obs: ObservationSchema) -> Dict[str, Any]:
        # Favor safe standard tasks or escalate if too complex
        return super()._reason_prioritization(task, obs)

    def get_agent_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Claude-Style Reasoning",
            "type": "Simulated External",
            "reasoning_style": "Cautious / Ethical CoT",
            "risk_profile": "High Avoidance",
            "optimization_focus": "Safety & Compliance",
            "stability_rating": "Very High",
            "benchmark_compatibility": "Experimental",
            "description": "Simulated cautious reasoning, strong risk avoidance, escalates under uncertainty."
        }
