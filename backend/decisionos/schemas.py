"""
DecisionOS Schemas
Pure-stdlib dataclasses for request/response validation.
Compatible with json.dumps / Flask jsonify without pydantic.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


def _asdict(obj: Any) -> Any:
    """Recursively convert dataclasses to dicts for JSON serialisation."""
    if hasattr(obj, '__dataclass_fields__'):
        return {k: _asdict(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [_asdict(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _asdict(v) for k, v in obj.items()}
    return obj


# ──────────────────────────────────────────────
# Task & Observation
# ──────────────────────────────────────────────

@dataclass
class TaskSchema:
    task_id: str
    domain_type: str
    title: str
    urgency: str
    importance: int
    risk_level: float
    budget_required: float
    time_required: float
    workforce_required: int
    metadata: Dict[str, Any]
    ground_truth_best_action: str
    explanation: str

    def model_dump(self) -> Dict[str, Any]:
        return _asdict(self)


@dataclass
class ObservationSchema:
    episode_id: str
    step_count: int
    current_domain: str
    task_queue: List[TaskSchema]
    available_budget: float
    available_time: float
    available_workforce: int
    global_risk_level: float
    current_task: Optional[TaskSchema]
    history: List[Dict[str, Any]]
    done: bool

    def model_dump(self) -> Dict[str, Any]:
        return _asdict(self)


# ──────────────────────────────────────────────
# Metrics / Scores
# ──────────────────────────────────────────────

@dataclass
class ComponentScores:
    decision_correctness: float
    resource_efficiency: float
    risk_handling_accuracy: float
    task_completion: float
    step_efficiency: float

    def model_dump(self) -> Dict[str, Any]:
        return _asdict(self)


@dataclass
class DISScore:
    current_dis: float
    final_dis: float
    component_scores: ComponentScores
    explanation: str

    def model_dump(self) -> Dict[str, Any]:
        return _asdict(self)


@dataclass
class GraderResult:
    decision_correctness: float
    resource_efficiency: float
    risk_handling_accuracy: float
    task_completion: float
    step_efficiency: float
    final_score: float
    detail: str

    def model_dump(self) -> Dict[str, Any]:
        return _asdict(self)
