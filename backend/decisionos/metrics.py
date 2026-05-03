"""
DecisionOS Metrics & Decision Intelligence Score (DIS)
Computes a normalized 0.0–1.0 composite score from grader component outputs.
"""
from __future__ import annotations
from typing import Any, Dict, List

from decisionos.schemas import DISScore, ComponentScores, GraderResult

# DIS weighting scheme (must sum to 1.0)
DIS_WEIGHTS: Dict[str, float] = {
    "decision_correctness":    0.35,
    "resource_efficiency":     0.20,
    "risk_handling_accuracy":  0.25,
    "task_completion":         0.12,
    "step_efficiency":         0.08,
}

assert abs(sum(DIS_WEIGHTS.values()) - 1.0) < 1e-9, "DIS weights must sum to 1.0"


def compute_dis(grader_results: List[GraderResult]) -> DISScore:
    """
    Compute the Decision Intelligence Score from one or more grader results.

    When multiple tasks have been evaluated (multi-step episode), each task
    contributes equally to the aggregate component scores.

    DIS = Σ weight_i * avg(component_i across tasks)
    """
    if not grader_results:
        empty = ComponentScores(
            decision_correctness=0.0,
            resource_efficiency=0.0,
            risk_handling_accuracy=0.0,
            task_completion=0.0,
            step_efficiency=0.0,
        )
        return DISScore(
            current_dis=0.0,
            final_dis=0.0,
            component_scores=empty,
            explanation="No graded tasks yet.",
        )

    n = len(grader_results)

    avg = ComponentScores(
        decision_correctness=sum(r.decision_correctness for r in grader_results) / n,
        resource_efficiency=sum(r.resource_efficiency for r in grader_results) / n,
        risk_handling_accuracy=sum(r.risk_handling_accuracy for r in grader_results) / n,
        task_completion=sum(r.task_completion for r in grader_results) / n,
        step_efficiency=sum(r.step_efficiency for r in grader_results) / n,
    )

    dis_value = (
        DIS_WEIGHTS["decision_correctness"] * avg.decision_correctness
        + DIS_WEIGHTS["resource_efficiency"] * avg.resource_efficiency
        + DIS_WEIGHTS["risk_handling_accuracy"] * avg.risk_handling_accuracy
        + DIS_WEIGHTS["task_completion"] * avg.task_completion
        + DIS_WEIGHTS["step_efficiency"] * avg.step_efficiency
    )
    dis_value = max(0.0, min(1.0, dis_value))

    explanation = _build_explanation(avg, dis_value, n)

    return DISScore(
        current_dis=dis_value,
        final_dis=dis_value,
        component_scores=avg,
        explanation=explanation,
    )


def _build_explanation(avg: ComponentScores, dis: float, n: int) -> str:
    tier = _dis_tier(dis)
    lines = [
        f"DIS = {dis:.4f} ({tier}) computed over {n} task(s).",
        f"  decision_correctness    = {avg.decision_correctness:.3f} × {DIS_WEIGHTS['decision_correctness']}",
        f"  resource_efficiency     = {avg.resource_efficiency:.3f} × {DIS_WEIGHTS['resource_efficiency']}",
        f"  risk_handling_accuracy  = {avg.risk_handling_accuracy:.3f} × {DIS_WEIGHTS['risk_handling_accuracy']}",
        f"  task_completion         = {avg.task_completion:.3f} × {DIS_WEIGHTS['task_completion']}",
        f"  step_efficiency         = {avg.step_efficiency:.3f} × {DIS_WEIGHTS['step_efficiency']}",
    ]
    return " | ".join(lines)


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


def reward_from_grader(result: GraderResult, baseline: float = 0.5) -> float:
    """
    Convert a grader final_score into a shaped reward signal.
    - Scores above baseline yield positive reward (+1.0 max).
    - Scores below baseline yield negative reward (-1.0 min).
    Reward is scaled to [-1.0, +1.0].
    """
    delta = result.final_score - baseline
    reward = delta * 2.0  # scale delta (max ±0.5) to ±1.0
    return max(-1.0, min(1.0, reward))
