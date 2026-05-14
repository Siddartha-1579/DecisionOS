"""
DecisionOS Core Environment
Implements DecisionEnv — a multi-step benchmark episode that progresses
through 3 tasks across 3 domains: prioritization → resource_allocation → risk_crisis.
"""
from __future__ import annotations
import uuid
from copy import deepcopy
from typing import Any, Dict, List, Optional

from decisionos.schemas import (
    ObservationSchema,
    TaskSchema,
    GraderResult,
    DISScore,
    ComponentScores,
)
from decisionos.tasks import TASK_REGISTRY, get_tasks_for_domain
from decisionos.actions import validate_action
from decisionos.graders import grade
from decisionos.metrics import compute_dis, reward_from_grader

# ─────────────────────────────────────────────────────────────────────────────
# Environment constants
# ─────────────────────────────────────────────────────────────────────────────

INITIAL_BUDGET: float = 25_000.0
INITIAL_TIME: float = 80.0       # hours
INITIAL_WORKFORCE: int = 8
MAX_STEPS: int = 20              # hard episode cap
GLOBAL_RISK_LEVEL: float = 0.65  # static backdrop risk


class DecisionEnv:
    """
    Multi-domain sequential decision-making environment.

    Episode structure:
        reset() → [step() × N] → done=True

    Each step processes one action against the current_task.
    When a task receives a graded action, the episode advances to the next task.
    The episode ends when all tasks are exhausted or MAX_STEPS is reached.
    """

    def __init__(self) -> None:
        self._episode_id: str = ""
        self._step_count: int = 0
        self._done: bool = False
        self._task_queue: List[TaskSchema] = []
        self._current_task_index: int = 0
        self._available_budget: float = INITIAL_BUDGET
        self._available_time: float = INITIAL_TIME
        self._available_workforce: int = INITIAL_WORKFORCE
        self._history: List[Dict[str, Any]] = []
        self._grader_results: List[GraderResult] = []
        self._total_reward: float = 0.0
        self._completed_tasks: int = 0
        self._failed_tasks: int = 0
        self._risk_failures: int = 0
        self.active_domain: str = "Operations"

    # ──────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────

    def reset(self, domain: str = "Operations") -> ObservationSchema:
        """Reset environment to initial state and return the first observation."""
        self._episode_id = str(uuid.uuid4())[:8].upper()
        self._step_count = 0
        self._done = False
        self.active_domain = domain
        self._task_queue = deepcopy(get_tasks_for_domain(domain))
        self._current_task_index = 0
        self._available_budget = INITIAL_BUDGET
        self._available_time = INITIAL_TIME
        self._available_workforce = INITIAL_WORKFORCE
        self._history = []
        self._grader_results = []
        self._total_reward = 0.0
        self._completed_tasks = 0
        self._failed_tasks = 0
        self._risk_failures = 0
        return self.get_observation()

    def get_observation(self) -> ObservationSchema:
        """Return the current environment observation."""
        current_task = self._current_task() 
        remaining = self._task_queue[self._current_task_index:]
        return ObservationSchema(
            episode_id=self._episode_id,
            step_count=self._step_count,
            current_domain=current_task.domain_type if current_task else "none",
            task_queue=remaining,
            available_budget=self._available_budget,
            available_time=self._available_time,
            available_workforce=self._available_workforce,
            global_risk_level=GLOBAL_RISK_LEVEL,
            current_task=current_task,
            history=self._history[-10:],   # last 10 events for context window
            done=self._done,
        )

    def step(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process one action.

        Returns dict with keys: observation, reward, done, info, metrics, dis.
        Raises ValueError on invalid action.
        """
        if self._done:
            raise ValueError("Episode is finished. Call /reset to start a new episode.")

        # Validate
        is_valid, err = validate_action(action)
        if not is_valid:
            raise ValueError(err)

        self._step_count += 1
        task = self._current_task()

        if task is None:
            self._done = True
            obs = self.get_observation()
            return self._build_step_result(obs, reward=0.0, info={"message": "No more tasks."})

        # Grade
        result = grade(
            task=task,
            action=action,
            step_count=self._step_count,
            available_budget=self._available_budget,
            available_time=self._available_time,
            available_workforce=self._available_workforce,
        )

        reward = reward_from_grader(result)
        self._total_reward += reward
        self._grader_results.append(result)

        # Track outcomes
        if result.final_score >= 0.65:
            self._completed_tasks += 1
        else:
            self._failed_tasks += 1
            if task.domain_type == "risk_crisis" and action.get("action_type") == "approve_decision":
                self._risk_failures += 1

        # Consume resources (domain-specific)
        self._consume_resources(task, action)

        # Log to history
        self._history.append({
            "step": self._step_count,
            "task_id": task.task_id,
            "domain": task.domain_type,
            "action": action,
            "reward": round(reward, 4),
            "grader_score": round(result.final_score, 4),
            "detail": result.detail,
        })

        # Advance to next task
        self._current_task_index += 1

        # Check terminal condition
        if (
            self._current_task_index >= len(self._task_queue)
            or self._step_count >= MAX_STEPS
        ):
            self._done = True

        obs = self.get_observation()
        return self._build_step_result(obs, reward=reward, info={"grader": result.model_dump()})

    def get_metrics(self) -> Dict[str, Any]:
        """Return current episode metrics including DIS."""
        dis = compute_dis(self._grader_results)
        return {
            "episode_id": self._episode_id,
            "step_count": self._step_count,
            "total_reward": round(self._total_reward, 4),
            "completed_tasks": self._completed_tasks,
            "failed_tasks": self._failed_tasks,
            "risk_failures": self._risk_failures,
            "dis": dis.model_dump(),
        }

    def run_agent(self, agent: Any, domain: str = "Operations") -> Dict[str, Any]:
        """
        Run a full episode with the given agent on a specific domain.
        Returns a summary dict compatible with SimulationResponse.
        """
        self.reset(domain)
        actions_taken: List[Dict[str, Any]] = []
        rewards: List[float] = []

        # Support both legacy agents and new adapters
        agent_name = getattr(agent, "name", None)
        if not agent_name and hasattr(agent, "get_agent_metadata"):
            agent_name = agent.get_agent_metadata().get("id", "unknown")

        while not self._done:
            obs = self.get_observation()
            if hasattr(agent, "decide_action"):
                action = agent.decide_action(obs)
            else:
                action = agent.act(obs)
            result = self.step(action)
            actions_taken.append(action)
            rewards.append(result["reward"])

        metrics = self.get_metrics()
        dis = compute_dis(self._grader_results)

        return {
            "agent_name": agent_name,
            "episode_id": self._episode_id,
            "steps_used": self._step_count,
            "total_reward": round(self._total_reward, 4),
            "final_dis": round(dis.final_dis, 4),
            "completed_tasks": self._completed_tasks,
            "risk_failures": self._risk_failures,
            "component_scores": dis.component_scores.model_dump(),
            "actions_taken": actions_taken,
            "rewards": [round(r, 4) for r in rewards],
            "summary": self._build_summary(agent_name, dis),
        }

    # ──────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────

    def _current_task(self) -> Optional[TaskSchema]:
        if self._current_task_index < len(self._task_queue):
            return self._task_queue[self._current_task_index]
        return None

    def _consume_resources(self, task: TaskSchema, action: Dict[str, Any]) -> None:
        """Deduct resources consumed by the action."""
        action_type = action.get("action_type", "")
        if action_type == "allocate_resources":
            spent = min(action.get("amount", 0.0), self._available_budget)
            self._available_budget -= spent
            self._available_time = max(0.0, self._available_time - task.time_required)
            self._available_workforce = max(
                0, self._available_workforce - task.workforce_required
            )
        elif action_type == "prioritize_task":
            # Minor time cost for prioritization overhead
            self._available_time = max(0.0, self._available_time - 0.5)
        elif action_type in ("escalate_issue", "reject_decision"):
            # Escalation/rejection requires brief analyst time
            self._available_time = max(0.0, self._available_time - task.time_required)
            self._available_workforce = max(
                0, self._available_workforce - task.workforce_required
            )

    def _build_step_result(
        self,
        obs: ObservationSchema,
        reward: float,
        info: Dict[str, Any],
    ) -> Dict[str, Any]:
        dis = compute_dis(self._grader_results)
        metrics = self.get_metrics()
        return {
            "observation": obs,
            "reward": round(reward, 4),
            "done": self._done,
            "info": info,
            "metrics": metrics,
            "dis": dis,
        }

    def _build_summary(self, agent_name: str, dis: DISScore) -> str:
        tier = _dis_tier(dis.final_dis)
        return (
            f"Agent '{agent_name}' completed the episode in {self._step_count} step(s) in {self.active_domain}. "
            f"Final DIS: {dis.final_dis:.4f} ({tier}). "
            f"Tasks completed: {self._completed_tasks}/{len(self._task_queue)}. "
            f"Total reward: {self._total_reward:.4f}. "
            f"Risk failures: {self._risk_failures}."
        )


def _dis_tier(dis: float) -> str:
    if dis >= 0.90:
        return "ELITE"
    if dis >= 0.75:
        return "PROFICIENT"
    if dis >= 0.55:
        return "DEVELOPING"
    if dis >= 0.35:
        return "NOVICE"
    return "POOR"
