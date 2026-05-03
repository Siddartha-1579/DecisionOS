"""
DecisionOS Baseline Agents
Three agents with increasing decision sophistication:
  1. RandomAgent     — random valid action selection
  2. RuleBasedAgent  — deterministic heuristic rules per domain
  3. MockLLMAgent    — simulates structured chain-of-thought reasoning
"""
from __future__ import annotations
import random
from typing import Any, Dict, List

from decisionos.schemas import ObservationSchema, TaskSchema
from decisionos.actions import build_action, DOMAIN_ACTIONS


# ─────────────────────────────────────────────────────────────────────────────
# Base Agent
# ─────────────────────────────────────────────────────────────────────────────

class BaseAgent:
    name: str = "base"

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        raise NotImplementedError


# ─────────────────────────────────────────────────────────────────────────────
# Agent 1 — RandomAgent
# Selects uniformly at random from domain-compatible actions.
# Expected DIS: ~0.20–0.35 (mostly wrong, occasionally lucky)
# ─────────────────────────────────────────────────────────────────────────────

class RandomAgent(BaseAgent):
    name = "random"

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="No task — fallback flag.")

        domain = task.domain_type
        compatible = DOMAIN_ACTIONS.get(domain, list(DOMAIN_ACTIONS.keys()))
        chosen_action = self._rng.choice(compatible)

        kwargs: Dict[str, Any] = {
            "task_id": task.task_id,
            "reason": f"RandomAgent: selected '{chosen_action}' at random.",
        }
        if chosen_action == "allocate_resources":
            # Random amount between 10% and 120% of budget_required
            budget = task.budget_required or observation.available_budget * 0.5
            kwargs["amount"] = round(self._rng.uniform(budget * 0.10, budget * 1.20), 2)

        return build_action(chosen_action, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# Agent 2 — RuleBasedAgent
# Applies explicit hand-crafted heuristics per domain.
# Expected DIS: ~0.55–0.70 (generally correct direction, suboptimal amounts)
# ─────────────────────────────────────────────────────────────────────────────

class RuleBasedAgent(BaseAgent):
    name = "rule_based"

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="No current task.")

        domain = task.domain_type

        if domain == "prioritization":
            return self._handle_prioritization(task, observation)
        elif domain == "resource_allocation":
            return self._handle_resource_allocation(task, observation)
        elif domain == "risk_crisis":
            return self._handle_risk_crisis(task, observation)
        else:
            return build_action("flag_risk", task_id=task.task_id, reason="Unknown domain.")

    def _handle_prioritization(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Rule: Find the task with urgency='critical'. If found, prioritize it.
        If multiple critical tasks exist, pick the one with highest importance.
        Otherwise, delay the least important task.
        """
        competing = task.metadata.get("competing_tasks", [])
        critical = [t for t in competing if t.get("urgency") == "critical"]

        if critical:
            best = max(critical, key=lambda t: t.get("importance", 0))
            return build_action(
                "prioritize_task",
                task_id=best["task_id"],
                reason=(
                    f"Rule: urgency=critical + importance={best.get('importance')} "
                    f"triggers immediate prioritization."
                ),
            )

        # Fall back: sort by importance descending, prioritize highest
        if competing:
            best = max(competing, key=lambda t: t.get("importance", 0))
            return build_action(
                "prioritize_task",
                task_id=best["task_id"],
                reason=f"Rule: highest importance task selected ({best.get('importance')}).",
            )

        return build_action(
            "prioritize_task",
            task_id=task.task_id,
            reason="Rule: default prioritize current task.",
        )

    def _handle_resource_allocation(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Rule: Allocate the total available budget (don't over- or under-spend).
        Use the full task.budget_required as the target amount.
        """
        total = task.metadata.get("total_budget", task.budget_required)
        available = obs.available_budget
        amount = min(total, available)
        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(amount, 2),
            reason=(
                f"Rule: allocate full sprint budget ${amount:.0f} "
                f"(available: ${available:.0f}, optimal target: ${total:.0f})."
            ),
        )

    def _handle_risk_crisis(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Rule: If risk_level > 0.7 → escalate_issue (requires human oversight).
             If risk_level > 0.4 → flag_risk for review.
             Otherwise → approve_decision.
        """
        risk = task.risk_level
        if risk > 0.7:
            return build_action(
                "escalate_issue",
                task_id=task.task_id,
                reason=(
                    f"Rule: risk_level={risk:.2f} exceeds 0.70 threshold "
                    f"→ escalate to human fraud review team."
                ),
            )
        elif risk > 0.4:
            return build_action(
                "flag_risk",
                task_id=task.task_id,
                reason=f"Rule: risk_level={risk:.2f} is moderate → flag for review.",
            )
        else:
            return build_action(
                "approve_decision",
                task_id=task.task_id,
                reason=f"Rule: risk_level={risk:.2f} is low → approve.",
            )


# ─────────────────────────────────────────────────────────────────────────────
# Agent 3 — MockLLMAgent
# Simulates structured chain-of-thought reasoning without requiring API keys.
# Expected DIS: ~0.82–0.95 (near-optimal, with principled justifications)
# ─────────────────────────────────────────────────────────────────────────────

class MockLLMAgent(BaseAgent):
    """
    Simulates an LLM-based reasoning agent using pre-structured CoT logic.

    In a production setting, this would call an LLM with a system prompt
    describing the DecisionOS action space and observation schema.
    Here, we encode the expected reasoning chain deterministically to:
      (a) demonstrate what a capable LLM response would look like,
      (b) establish an upper-bound baseline for the benchmark,
      (c) avoid requiring external API keys.

    The agent's reasoning trace is returned as part of the action 'reason' field.
    """
    name = "mock_llm"

    def act(self, observation: ObservationSchema) -> Dict[str, Any]:
        task = observation.current_task
        if task is None:
            return build_action("flag_risk", reason="[CoT] No active task. Flagging as precaution.")

        domain = task.domain_type

        if domain == "prioritization":
            return self._reason_prioritization(task, observation)
        elif domain == "resource_allocation":
            return self._reason_resource_allocation(task, observation)
        elif domain == "risk_crisis":
            return self._reason_risk_crisis(task, observation)
        else:
            return build_action("flag_risk", task_id=task.task_id, reason="[CoT] Unknown domain.")

    def _reason_prioritization(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Chain-of-thought:
        1. Parse competing tasks from metadata.
        2. Score each by urgency × importance × deadline_pressure.
        3. Select the highest-scoring task and emit prioritize_task.
        """
        competing: List[Dict[str, Any]] = task.metadata.get("competing_tasks", [])

        urgency_weight = {"low": 1, "medium": 3, "high": 6, "critical": 10}

        scored = []
        for t in competing:
            u = urgency_weight.get(t.get("urgency", "low"), 1)
            imp = t.get("importance", 1)
            deadline = t.get("deadline_hours", 72)
            # Pressure = urgency × importance / log(deadline+1)
            import math
            pressure = (u * imp) / (math.log(deadline + 1) + 0.01)
            scored.append((pressure, t))

        if not scored:
            return build_action(
                "prioritize_task",
                task_id=task.task_id,
                reason="[CoT] No competing tasks found. Prioritizing current task.",
            )

        best_pressure, best_task = max(scored, key=lambda x: x[0])
        cot_trace = (
            f"[CoT] Evaluated {len(scored)} competing tasks using "
            f"pressure = urgency_weight × importance / log(deadline+1). "
            f"Highest pressure: {best_task['task_id']} "
            f"(urgency={best_task.get('urgency')}, "
            f"importance={best_task.get('importance')}, "
            f"deadline={best_task.get('deadline_hours')}h, "
            f"score={best_pressure:.2f}). "
            f"Action: prioritize_task on {best_task['task_id']}."
        )

        return build_action(
            "prioritize_task",
            task_id=best_task["task_id"],
            reason=cot_trace,
        )

    def _reason_resource_allocation(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Chain-of-thought:
        1. Retrieve project list and their ROI scores + minimums.
        2. Compute optimal allocation: satisfy all minimums first,
           then distribute surplus proportional to ROI scores.
        3. Report the total as the 'amount'.
        """
        projects: List[Dict[str, Any]] = task.metadata.get("projects", [])
        total_budget = task.metadata.get("total_budget", obs.available_budget)

        # Step 1: Satisfy minimums
        allocated: Dict[str, float] = {}
        remaining = total_budget
        for p in projects:
            allocated[p["project_id"]] = p["min_budget"]
            remaining -= p["min_budget"]

        # Step 2: Distribute surplus by ROI weight
        total_roi = sum(p["roi_score"] for p in projects)
        for p in projects:
            share = (p["roi_score"] / total_roi) * remaining
            allocated[p["project_id"]] += share

        # Step 3: Cap at max_budget
        for p in projects:
            allocated[p["project_id"]] = min(
                allocated[p["project_id"]], p["max_budget"]
            )

        final_total = sum(allocated.values())
        cot_trace = (
            f"[CoT] Resource allocation reasoning: "
            f"Total budget=${total_budget:.0f}. "
            f"Minimums satisfied: {', '.join(f'{k}=${v:.0f}' for k, v in allocated.items())}. "
            f"Surplus distributed proportionally by ROI. "
            f"Final allocation total=${final_total:.0f}. "
            f"Action: allocate_resources with amount={final_total:.0f}."
        )

        return build_action(
            "allocate_resources",
            task_id=task.task_id,
            amount=round(final_total, 2),
            reason=cot_trace,
        )

    def _reason_risk_crisis(
        self, task: TaskSchema, obs: ObservationSchema
    ) -> Dict[str, Any]:
        """
        Chain-of-thought:
        1. Assess ML fraud score, velocity breach, geographic anomaly.
        2. Determine if auto-reject suffices or human review is mandatory.
        3. If score > 0.85 AND value > $50k AND multi-account → escalate.
        4. Justify regulatory compliance requirement.
        """
        alert = task.metadata.get("alert", {})
        ml_score = alert.get("ml_fraud_score", 0.0)
        total_value = alert.get("total_value_usd", 0)
        geo_anomaly = alert.get("geographic_anomaly", False)
        velocity = alert.get("velocity_breach", False)
        accounts = alert.get("affected_accounts", 1)
        account_ages = alert.get("account_age_days", [])

        # Decision tree
        high_ml = ml_score > 0.85
        high_value = total_value > 50_000
        multi_account = accounts > 1
        new_account = any(age < 30 for age in account_ages)

        cot_lines = [
            f"[CoT] Fraud risk assessment:",
            f"  ML fraud score: {ml_score:.2f} → {'HIGH' if high_ml else 'MODERATE'}",
            f"  Transaction value: ${total_value:,} → {'HIGH' if high_value else 'LOW'}",
            f"  Geographic anomaly: {geo_anomaly}",
            f"  Velocity breach: {velocity}",
            f"  Affected accounts: {accounts} (new <30d: {new_account})",
        ]

        if high_ml and high_value and multi_account:
            cot_lines.append(
                "  → ALL three critical flags active. "
                "  Auto-reject insufficient (regulatory audit trail required). "
                "  → DECISION: escalate_issue to fraud review team."
            )
            action_type = "escalate_issue"
        elif high_ml:
            cot_lines.append(
                "  → High ML score only. Reject transaction as precaution. "
                "  → DECISION: reject_decision."
            )
            action_type = "reject_decision"
        elif geo_anomaly or velocity:
            cot_lines.append(
                "  → Anomaly signals present but ML score borderline. "
                "  → DECISION: flag_risk for analyst review."
            )
            action_type = "flag_risk"
        else:
            cot_lines.append(
                "  → Risk signals insufficient. "
                "  → DECISION: approve_decision."
            )
            action_type = "approve_decision"

        return build_action(
            action_type,
            task_id=task.task_id,
            reason=" | ".join(cot_lines),
        )
