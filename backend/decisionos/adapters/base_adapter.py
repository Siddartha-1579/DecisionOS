"""
Base Adapter Interface for DecisionOS
"""
from typing import Any, Dict

from decisionos.schemas import ObservationSchema

class BaseAdapter:
    """
    Unified adapter interface for evaluating AI agents.
    All internal and external agents must implement this interface.
    """
    
    def initialize(self) -> None:
        """Called before the benchmark starts to perform any necessary setup."""
        pass

    def decide_action(self, observation: ObservationSchema) -> Dict[str, Any]:
        """
        Receives an observation and returns an action dictionary.
        Must be implemented by subclasses.
        """
        raise NotImplementedError

    def reset(self) -> None:
        """Called between benchmark episodes to reset agent state if necessary."""
        pass

    def get_agent_metadata(self) -> Dict[str, Any]:
        """
        Returns metadata about the agent for benchmark reporting and frontend display.
        Should return a dictionary containing:
        - name: str
        - type: str (e.g., 'Native', 'Simulated', 'External')
        - reasoning_style: str
        - risk_profile: str
        - optimization_focus: str
        - stability_rating: str
        - benchmark_compatibility: str
        - description: str
        """
        return {
            "name": "base_adapter",
            "type": "Native",
            "reasoning_style": "None",
            "risk_profile": "Neutral",
            "optimization_focus": "None",
            "stability_rating": "Unknown",
            "benchmark_compatibility": "Experimental",
            "description": "Base adapter interface."
        }
