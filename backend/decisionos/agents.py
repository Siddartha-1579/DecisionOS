"""
DecisionOS Baseline Agents (Deprecated - Use adapters/ instead)
"""
from __future__ import annotations
from typing import Any, Dict

from decisionos.schemas import ObservationSchema
from decisionos.adapters import AgentRegistry

class BaseAgent:
    name: str = "base"

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        raise NotImplementedError

class RandomAgent(BaseAgent):
    name = "random"
    def __init__(self, seed: int = 42) -> None:
        self.adapter = AgentRegistry.get_agent("random")
        if hasattr(self.adapter, "_rng"):
            import random
            self.adapter._rng = random.Random(seed)

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        return self.adapter.decide_action(observation)

class RuleBasedAgent(BaseAgent):
    name = "rule_based"
    def __init__(self) -> None:
        self.adapter = AgentRegistry.get_agent("rule_based")

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        return self.adapter.decide_action(observation)

class MockLLMAgent(BaseAgent):
    name = "mock_llm"
    def __init__(self) -> None:
        self.adapter = AgentRegistry.get_agent("mock_llm")

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        return self.adapter.decide_action(observation)
