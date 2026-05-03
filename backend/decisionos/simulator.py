"""
DecisionOS Simulator
Utilities for running multi-episode simulations, collecting statistics,
and generating benchmark reports. Designed for research use.
"""
from __future__ import annotations
from typing import Any, Dict, List, Type

from decisionos.environment import DecisionEnv
from decisionos.agents import BaseAgent, RandomAgent, RuleBasedAgent, MockLLMAgent
from decisionos.metrics import compute_dis


AGENT_REGISTRY: Dict[str, Type[BaseAgent]] = {
    "random": RandomAgent,
    "rule_based": RuleBasedAgent,
    "mock_llm": MockLLMAgent,
}


def run_single_episode(agent: BaseAgent) -> Dict[str, Any]:
    """Run one episode with the provided agent and return the full result dict."""
    env = DecisionEnv()
    return env.run_agent(agent)


def run_benchmark(n_episodes: int = 1) -> Dict[str, Any]:
    """
    Run all registered agents for n_episodes each.
    Returns aggregated statistics for research reporting.
    """
    results: Dict[str, List[Dict[str, Any]]] = {name: [] for name in AGENT_REGISTRY}

    for name, cls in AGENT_REGISTRY.items():
        for ep in range(n_episodes):
            agent = cls()
            episode_result = run_single_episode(agent)
            results[name].append(episode_result)

    return _aggregate(results, n_episodes)


def _aggregate(
    results: Dict[str, List[Dict[str, Any]]],
    n_episodes: int,
) -> Dict[str, Any]:
    """Compute mean statistics across episodes per agent."""
    summary = {}
    for name, episodes in results.items():
        avg_dis = sum(e["final_dis"] for e in episodes) / n_episodes
        avg_reward = sum(e["total_reward"] for e in episodes) / n_episodes
        avg_steps = sum(e["steps_used"] for e in episodes) / n_episodes
        avg_completed = sum(e["completed_tasks"] for e in episodes) / n_episodes
        avg_risk_failures = sum(e["risk_failures"] for e in episodes) / n_episodes

        summary[name] = {
            "agent": name,
            "episodes": n_episodes,
            "avg_dis": round(avg_dis, 4),
            "avg_total_reward": round(avg_reward, 4),
            "avg_steps": round(avg_steps, 2),
            "avg_completed_tasks": round(avg_completed, 2),
            "avg_risk_failures": round(avg_risk_failures, 2),
        }

    # Rank by DIS
    ranked = sorted(summary.values(), key=lambda x: x["avg_dis"], reverse=True)
    return {
        "benchmark_summary": ranked,
        "n_episodes": n_episodes,
        "agents_evaluated": list(AGENT_REGISTRY.keys()),
    }
