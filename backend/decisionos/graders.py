"""
DecisionOS Deterministic Graders
One grader per domain. No randomness. All scoring is rule-based and reproducible.

Each grader receives:
  - task: the TaskSchema being evaluated
  - action: the action dict the agent submitted
  - step_count: how many steps were used to reach this action
  - available_budget / available_time / available_workforce: remaining resources

Each grader returns a GraderResult with six float scores (0.0–1.0) plus a detail string.
"""
from __future__ import annotations
from typing import Any, Dict

from decisionos.schemas import GraderResult
from decisionos.actions import is_action_domain_compatible


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _step_efficiency(step_count: int, ideal_steps: int, max_steps: int) -> float:
    """
    Reward using fewer steps. Returns 1.0 at ideal_steps, decays linearly to 0.0
    at max_steps.
    """
    if step_count <= ideal_steps:
        return 1.0
    over = step_count - ideal_steps
    span = max_steps - ideal_steps
    return _clamp(1.0 - (over / span))


# ─────────────────────────────────────────────────────────────────────────────
# Grader 1 — Task Prioritization
# ─────────────────────────────────────────────────────────────────────────────

def grade_prioritization(
    task: Any,
    action: Dict[str, Any],
    step_count: int,
    available_budget: float,
    available_time: float,
    available_workforce: int,
) -> GraderResult:
    """
    Evaluate a prioritization decision.

    Scoring logic:
    - decision_correctness: 1.0 if action_type == 'prioritize_task', 0.0 for delay_task,
      0.3 for flag_risk (partial awareness), 0.0 otherwise.
    - resource_efficiency: Resources were barely consumed (prioritization is cognitive,
      not budget-heavy). Score 1.0 if no allocate_resources was unnecessarily called.
    - risk_handling_accuracy: Was the critical urgency respected?
    - task_completion: Did the action logically complete the task?
    - step_efficiency: Fewer steps = better.
    """
    action_type = action.get("action_type", "")
    competing = task.metadata.get("competing_tasks", [])

    # Identify the ground-truth urgent task
    critical_tasks = [t for t in competing if t.get("urgency") == "critical"]
    critical_ids = {t["task_id"] for t in critical_tasks}

    # Decision correctness
    if action_type == "prioritize_task":
        # Extra credit if they named the right task
        chosen = action.get("task_id", "")
        if chosen in critical_ids or chosen == task.task_id:
            decision_correctness = 1.0
        else:
            decision_correctness = 0.5  # Right action, wrong target
    elif action_type == "delay_task":
        # Delay is correct for the non-urgent tasks, wrong for the critical one
        chosen = action.get("task_id", "")
        if chosen in critical_ids:
            decision_correctness = 0.0  # Delayed the critical task — bad
        else:
            decision_correctness = 0.6  # Correct partial move
    elif action_type == "flag_risk":
        decision_correctness = 0.3  # Aware but not acting decisively
    elif action_type in ("approve_decision", "reject_decision", "escalate_issue"):
        decision_correctness = 0.1  # Wrong domain action
    else:
        decision_correctness = 0.0

    # Resource efficiency — prioritization shouldn't burn budget
    resource_efficiency = 1.0 if action_type != "allocate_resources" else 0.6

    # Risk handling accuracy — did the agent respect urgency=critical?
    risk_handling_accuracy = 1.0 if action_type == "prioritize_task" else 0.3

    # Task completion — did this action logically resolve the task?
    task_completion = 1.0 if action_type == "prioritize_task" else 0.4

    # Step efficiency — ideal: 1 step; max: 5
    step_eff = _step_efficiency(step_count, ideal_steps=1, max_steps=5)

    final_score = (
        0.35 * decision_correctness
        + 0.15 * resource_efficiency
        + 0.20 * risk_handling_accuracy
        + 0.20 * task_completion
        + 0.10 * step_eff
    )

    detail = (
        f"Action '{action_type}' on prioritization task. "
        f"Critical task IDs: {critical_ids}. "
        f"Chosen task_id: '{action.get('task_id', 'none')}'. "
        f"decision_correctness={decision_correctness:.2f}, "
        f"step_efficiency={step_eff:.2f}."
    )

    return GraderResult(
        decision_correctness=_clamp(decision_correctness),
        resource_efficiency=_clamp(resource_efficiency),
        risk_handling_accuracy=_clamp(risk_handling_accuracy),
        task_completion=_clamp(task_completion),
        step_efficiency=_clamp(step_eff),
        final_score=_clamp(final_score),
        detail=detail,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Grader 2 — Resource Allocation
# ─────────────────────────────────────────────────────────────────────────────

def grade_resource_allocation(
    task: Any,
    action: Dict[str, Any],
    step_count: int,
    available_budget: float,
    available_time: float,
    available_workforce: int,
) -> GraderResult:
    """
    Evaluate a resource allocation decision.

    Scoring logic:
    - decision_correctness: Was allocate_resources chosen?
    - resource_efficiency: How close is the submitted amount to the optimal allocation?
      Measured as 1 - |submitted - optimal| / total_budget, clamped to [0,1].
    - risk_handling_accuracy: Did the agent allocate enough to the security project?
    - task_completion: Was the full budget allocated (not wasted, not overspent)?
    - step_efficiency: 1–2 ideal steps.
    """
    action_type = action.get("action_type", "")
    total_budget = task.metadata.get("total_budget", 20000.0)
    optimal = task.metadata.get("optimal_allocation", {})
    optimal_p1_budget = optimal.get("P1", {}).get("budget", 10000)

    # Decision correctness
    if action_type == "allocate_resources":
        decision_correctness = 1.0
    elif action_type == "flag_risk":
        decision_correctness = 0.2
    elif action_type == "delay_task":
        decision_correctness = 0.1
    else:
        decision_correctness = 0.0

    # Resource efficiency — evaluate amount proximity to optimal total spend
    submitted_amount = action.get("amount") or 0.0
    if action_type == "allocate_resources" and submitted_amount > 0:
        # Ideal total spend == total_budget (no waste, no overage)
        deviation = abs(submitted_amount - total_budget) / total_budget
        resource_efficiency = _clamp(1.0 - deviation)
        # Penalize overspend more heavily
        if submitted_amount > total_budget:
            resource_efficiency *= 0.7
    else:
        resource_efficiency = 0.0 if action_type == "allocate_resources" else 0.5

    # Risk handling — did they prioritize the security project adequately?
    # Heuristic: if amount >= optimal_p1_budget they likely respected the risk priority
    if action_type == "allocate_resources" and submitted_amount >= optimal_p1_budget:
        risk_handling_accuracy = 1.0
    elif action_type == "allocate_resources":
        risk_handling_accuracy = _clamp(submitted_amount / optimal_p1_budget)
    else:
        risk_handling_accuracy = 0.2

    # Task completion
    task_completion = 1.0 if action_type == "allocate_resources" else 0.0

    # Step efficiency — 1–2 ideal for allocation
    step_eff = _step_efficiency(step_count, ideal_steps=2, max_steps=6)

    final_score = (
        0.30 * decision_correctness
        + 0.30 * resource_efficiency
        + 0.20 * risk_handling_accuracy
        + 0.10 * task_completion
        + 0.10 * step_eff
    )

    detail = (
        f"Action '{action_type}', amount={submitted_amount:.0f} "
        f"(optimal total={total_budget:.0f}). "
        f"Security project optimal=${optimal_p1_budget:.0f}. "
        f"resource_efficiency={resource_efficiency:.2f}, "
        f"risk_handling_accuracy={risk_handling_accuracy:.2f}."
    )

    return GraderResult(
        decision_correctness=_clamp(decision_correctness),
        resource_efficiency=_clamp(resource_efficiency),
        risk_handling_accuracy=_clamp(risk_handling_accuracy),
        task_completion=_clamp(task_completion),
        step_efficiency=_clamp(step_eff),
        final_score=_clamp(final_score),
        detail=detail,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Grader 3 — Risk & Crisis Handling
# ─────────────────────────────────────────────────────────────────────────────

def grade_risk_crisis(
    task: Any,
    action: Dict[str, Any],
    step_count: int,
    available_budget: float,
    available_time: float,
    available_workforce: int,
) -> GraderResult:
    """
    Evaluate a risk/crisis handling decision.

    Ground truth: escalate_issue is the correct action.

    Scoring logic:
    - decision_correctness: escalate=1.0, reject=0.5 (stops loss but incomplete),
      flag_risk=0.2 (insufficient), approve=0.0 (reckless), others=0.1
    - resource_efficiency: Risk tasks are time-critical, not budget-heavy.
      Full score if action taken in 1 step; degrades with delay.
    - risk_handling_accuracy: escalate=1.0, reject=0.55, flag=0.20, approve=0.0
    - task_completion: escalate=1.0, others < 1.0
    - step_efficiency: Ideal=1 step (crisis demands speed)
    """
    action_type = action.get("action_type", "")
    ml_score = task.metadata.get("alert", {}).get("ml_fraud_score", 0.94)

    # Decision correctness
    decision_map = {
        "escalate_issue": 1.0,
        "reject_decision": 0.55,   # Stops damage but misses compliance trail
        "flag_risk": 0.20,         # Too passive
        "approve_decision": 0.0,   # Reckless — ML score 0.94
        "prioritize_task": 0.10,
        "delay_task": 0.0,
        "allocate_resources": 0.05,
    }
    decision_correctness = decision_map.get(action_type, 0.0)

    # Resource efficiency — crisis response should be fast, not resource-intensive
    # We reward taking action in as few steps as possible
    resource_efficiency = _step_efficiency(step_count, ideal_steps=1, max_steps=4)

    # Risk handling accuracy — reflect how well the severity was matched
    risk_map = {
        "escalate_issue": 1.0,
        "reject_decision": 0.55,
        "flag_risk": 0.20,
        "approve_decision": 0.0,
        "prioritize_task": 0.10,
        "delay_task": 0.0,
        "allocate_resources": 0.05,
    }
    risk_handling_accuracy = risk_map.get(action_type, 0.0)
    # Scale slightly with ML score — higher ML score makes wrong decisions worse
    if action_type == "approve_decision":
        risk_handling_accuracy -= ml_score * 0.3  # extra penalty

    # Task completion
    task_completion = 1.0 if action_type == "escalate_issue" else (
        0.5 if action_type == "reject_decision" else 0.1
    )

    # Step efficiency
    step_eff = _step_efficiency(step_count, ideal_steps=1, max_steps=5)

    final_score = (
        0.35 * decision_correctness
        + 0.10 * resource_efficiency
        + 0.35 * risk_handling_accuracy
        + 0.10 * task_completion
        + 0.10 * step_eff
    )

    detail = (
        f"Action '{action_type}' on fraud cluster (ml_score={ml_score:.2f}). "
        f"Ground truth: escalate_issue. "
        f"decision_correctness={decision_correctness:.2f}, "
        f"risk_handling_accuracy={_clamp(risk_handling_accuracy):.2f}."
    )

    return GraderResult(
        decision_correctness=_clamp(decision_correctness),
        resource_efficiency=_clamp(resource_efficiency),
        risk_handling_accuracy=_clamp(risk_handling_accuracy),
        task_completion=_clamp(task_completion),
        step_efficiency=_clamp(step_eff),
        final_score=_clamp(final_score),
        detail=detail,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

GRADER_MAP = {
    "prioritization": grade_prioritization,
    "resource_allocation": grade_resource_allocation,
    "risk_crisis": grade_risk_crisis,
}


def grade(
    task: Any,
    action: Dict[str, Any],
    step_count: int,
    available_budget: float,
    available_time: float,
    available_workforce: int,
) -> GraderResult:
    """Dispatch to the correct domain grader."""
    domain = task.domain_type
    if domain not in GRADER_MAP:
        raise ValueError(f"No grader for domain '{domain}'.")
    return GRADER_MAP[domain](
        task=task,
        action=action,
        step_count=step_count,
        available_budget=available_budget,
        available_time=available_time,
        available_workforce=available_workforce,
    )
