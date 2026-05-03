"""
DecisionOS Task Registry
Defines the 3 benchmark tasks across 3 domains.
Each task includes complete metadata and the ground-truth best action.
"""
from decisionos.schemas import TaskSchema

# ─────────────────────────────────────────────────────────────────────────────
# Task 1 — TASK PRIORITIZATION (Easy)
# Scenario: 3 concurrent work items land in the queue simultaneously.
# The agent must identify which should be handled first.
# Ground truth: T1 (critical urgency, importance=9) must go first.
# ─────────────────────────────────────────────────────────────────────────────

TASK_PRIORITIZATION = TaskSchema(
    task_id="T1",
    domain_type="prioritization",
    title="Production Database Outage vs. Feature Requests",
    urgency="critical",
    importance=9,
    risk_level=0.85,
    budget_required=500.0,
    time_required=2.0,
    workforce_required=3,
    metadata={
        "competing_tasks": [
            {
                "task_id": "T1A",
                "title": "New feature UI polish",
                "urgency": "low",
                "importance": 4,
                "deadline_hours": 72,
            },
            {
                "task_id": "T1B",
                "title": "Production DB experiencing partial outage (30% queries failing)",
                "urgency": "critical",
                "importance": 9,
                "deadline_hours": 0.5,
            },
            {
                "task_id": "T1C",
                "title": "Quarterly report formatting",
                "urgency": "medium",
                "importance": 5,
                "deadline_hours": 24,
            },
        ],
        "context": (
            "It is 09:15 on a Monday. Revenue-generating production DB is degraded. "
            "Customer-facing services are partially down. The UI feature and report "
            "can wait. Who should the on-call team focus on immediately?"
        ),
    },
    ground_truth_best_action="prioritize_task",
    explanation=(
        "T1B (production DB outage) must be prioritized first. Critical urgency + "
        "highest importance + 30-minute deadline overwhelm the other tasks. "
        "Delaying a critical outage incurs cascading customer and revenue damage."
    ),
)

# ─────────────────────────────────────────────────────────────────────────────
# Task 2 — RESOURCE ALLOCATION (Medium)
# Scenario: 3 projects compete for a fixed $20,000 budget, 40 work-hours,
# and 5 engineers. The agent must distribute optimally.
# Ground truth: allocate_resources with the highest-ROI distribution.
# ─────────────────────────────────────────────────────────────────────────────

TASK_RESOURCE_ALLOCATION = TaskSchema(
    task_id="T2",
    domain_type="resource_allocation",
    title="Sprint Budget Allocation Across 3 Competing Projects",
    urgency="high",
    importance=8,
    risk_level=0.40,
    budget_required=20000.0,
    time_required=40.0,
    workforce_required=5,
    metadata={
        "total_budget": 20000.0,
        "total_hours": 40.0,
        "total_engineers": 5,
        "projects": [
            {
                "project_id": "P1",
                "name": "Security patch rollout",
                "min_budget": 8000,
                "max_budget": 12000,
                "min_hours": 16,
                "min_engineers": 2,
                "roi_score": 9,
                "risk_if_skipped": "critical",
            },
            {
                "project_id": "P2",
                "name": "Customer-facing API upgrade",
                "min_budget": 5000,
                "max_budget": 8000,
                "min_hours": 16,
                "min_engineers": 2,
                "roi_score": 7,
                "risk_if_skipped": "medium",
            },
            {
                "project_id": "P3",
                "name": "Internal analytics dashboard",
                "min_budget": 2000,
                "max_budget": 4000,
                "min_hours": 8,
                "min_engineers": 1,
                "roi_score": 4,
                "risk_if_skipped": "low",
            },
        ],
        "optimal_allocation": {
            "P1": {"budget": 10000, "hours": 20, "engineers": 2},
            "P2": {"budget": 7000, "hours": 14, "engineers": 2},
            "P3": {"budget": 3000, "hours": 6, "engineers": 1},
        },
        "context": (
            "A two-week sprint begins tomorrow. The PM must finalize resource "
            "allocation. Security patch is non-negotiable; skipping it risks a "
            "breach. The API upgrade drives Q3 revenue. The dashboard is nice-to-have."
        ),
    },
    ground_truth_best_action="allocate_resources",
    explanation=(
        "Optimal allocation: $10k / 20h / 2 engineers to Security (P1), "
        "$7k / 14h / 2 engineers to API (P2), $3k / 6h / 1 engineer to Dashboard (P3). "
        "This satisfies all minimums, respects ROI ordering, and leaves no waste."
    ),
)

# ─────────────────────────────────────────────────────────────────────────────
# Task 3 — RISK & CRISIS HANDLING (Hard)
# Scenario: A payment processor flags a suspicious transaction cluster.
# The agent must decide: approve, reject, escalate, or flag_risk.
# Ground truth: escalate_issue (not simply reject — needs human fraud review).
# ─────────────────────────────────────────────────────────────────────────────

TASK_RISK_CRISIS = TaskSchema(
    task_id="T3",
    domain_type="risk_crisis",
    title="Suspicious Payment Cluster — Potential Fraud Escalation",
    urgency="critical",
    importance=10,
    risk_level=0.92,
    budget_required=0.0,
    time_required=0.5,
    workforce_required=1,
    metadata={
        "alert": {
            "alert_id": "FRD-2024-0847",
            "type": "fraud_cluster",
            "transactions_flagged": 47,
            "total_value_usd": 184320,
            "time_window_minutes": 12,
            "geographic_anomaly": True,
            "velocity_breach": True,
            "ml_fraud_score": 0.94,
            "affected_accounts": 3,
            "account_age_days": [1203, 87, 2],
        },
        "context": (
            "ML model flags a cluster of 47 transactions totalling $184k in 12 minutes "
            "across 3 accounts. One account is 2 days old (high-risk indicator). "
            "Geographic anomaly detected (transactions from 4 countries simultaneously). "
            "ML fraud score: 0.94. Auto-reject would block $184k immediately but could "
            "harm legitimate customers. Ignoring it risks $184k + regulatory exposure. "
            "The correct action is escalation to the fraud review team for human oversight."
        ),
        "available_actions_reasoning": {
            "approve_decision": "WRONG — ML score 0.94 makes approval reckless.",
            "reject_decision": "PARTIALLY CORRECT — stops loss but may harm legit customers; "
                               "misses audit trail and regulatory requirement for human review.",
            "escalate_issue": "CORRECT — triggers fraud review team, pauses transactions, "
                               "creates compliance record, preserves customer relationships.",
            "flag_risk": "INSUFFICIENT — only marks for later review; doesn't pause transactions.",
        },
    },
    ground_truth_best_action="escalate_issue",
    explanation=(
        "escalate_issue is correct: ML fraud score 0.94 + velocity breach + geographic anomaly "
        "exceed auto-reject threshold but the $184k value and multi-account nature require "
        "human fraud review (regulatory compliance). Escalation pauses transactions AND "
        "creates a compliance audit trail, which reject_decision alone does not provide."
    ),
)

# ─────────────────────────────────────────────────────────────────────────────
# Registry — ordered list that defines episode progression
# ─────────────────────────────────────────────────────────────────────────────

TASK_REGISTRY: list[TaskSchema] = [
    TASK_PRIORITIZATION,
    TASK_RESOURCE_ALLOCATION,
    TASK_RISK_CRISIS,
]

TASK_BY_ID: dict[str, TaskSchema] = {t.task_id: t for t in TASK_REGISTRY}
