"""
DecisionOS Action Space
Defines valid actions, their metadata, and validation logic.
"""
from __future__ import annotations
from typing import Any, Dict, Optional

VALID_ACTIONS = {
    "prioritize_task",
    "delay_task",
    "allocate_resources",
    "approve_decision",
    "reject_decision",
    "escalate_issue",
    "flag_risk",
}

ACTION_DESCRIPTIONS: Dict[str, str] = {
    "prioritize_task": (
        "Move the specified task to the top of the execution queue, "
        "signalling it should be handled before all others."
    ),
    "delay_task": (
        "Defer the specified task to a later time slot, "
        "freeing current resources for more urgent work."
    ),
    "allocate_resources": (
        "Assign budget (amount field), time, and workforce to the specified task. "
        "Triggers resource efficiency grading."
    ),
    "approve_decision": (
        "Approve the current decision/transaction/request as-is. "
        "Carries risk in high-risk scenarios."
    ),
    "reject_decision": (
        "Reject the current decision/transaction/request outright. "
        "May be overly aggressive in nuanced risk situations."
    ),
    "escalate_issue": (
        "Route the issue to human experts or a higher authority. "
        "Appropriate for high-ambiguity or high-stakes situations."
    ),
    "flag_risk": (
        "Mark the issue for future review without immediate action. "
        "Insufficient when immediate intervention is needed."
    ),
}

# Domain-action compatibility matrix
# Maps domain_type -> list of actions that are relevant
DOMAIN_ACTIONS: Dict[str, list[str]] = {
    "prioritization": ["prioritize_task", "delay_task", "flag_risk"],
    "resource_allocation": ["allocate_resources", "delay_task", "flag_risk"],
    "risk_crisis": [
        "approve_decision",
        "reject_decision",
        "escalate_issue",
        "flag_risk",
    ],
}


def validate_action(action: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate that an action dict is structurally correct.
    Returns (is_valid, error_message).
    """
    action_type = action.get("action_type")
    if not action_type:
        return False, "action_type is required."
    if action_type not in VALID_ACTIONS:
        return False, (
            f"Unknown action_type '{action_type}'. "
            f"Valid options: {sorted(VALID_ACTIONS)}"
        )
    if action_type == "allocate_resources" and action.get("amount") is None:
        return False, "allocate_resources requires an 'amount' field."
    return True, ""


def is_action_domain_compatible(action_type: str, domain_type: str) -> bool:
    """Return True if the action makes sense for the given domain."""
    return action_type in DOMAIN_ACTIONS.get(domain_type, [])


def build_action(
    action_type: str,
    task_id: Optional[str] = None,
    amount: Optional[float] = None,
    reason: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Convenience factory for building well-formed action dicts."""
    action: Dict[str, Any] = {"action_type": action_type}
    if task_id:
        action["task_id"] = task_id
    if amount is not None:
        action["amount"] = amount
    if reason:
        action["reason"] = reason
    action.update(kwargs)
    return action
