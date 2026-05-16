"""
DecisionOS Task Registry
Defines the 3 benchmark tasks across 5 domains.
Each task includes complete metadata and the ground-truth best action.
"""
from decisionos.schemas import TaskSchema

def create_prioritization_task(task_id, domain, title, alternatives, context, expl):
    return TaskSchema(
        task_id=task_id,
        domain_type=domain,
        title=title,
        urgency="critical",
        importance=9,
        risk_level=0.85,
        budget_required=500.0,
        time_required=2.0,
        workforce_required=3,
        metadata={
            "competing_tasks": alternatives,
            "context": context,
        },
        ground_truth_best_action="prioritize_task",
        explanation=expl,
    )

def create_allocation_task(task_id, domain, title, projects, optimal, context, expl):
    return TaskSchema(
        task_id=task_id,
        domain_type=domain,
        title=title,
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
            "projects": projects,
            "optimal_allocation": optimal,
            "context": context,
        },
        ground_truth_best_action="allocate_resources",
        explanation=expl,
    )

def create_crisis_task(task_id, domain, title, alert_data, context, expl):
    return TaskSchema(
        task_id=task_id,
        domain_type=domain,
        title=title,
        urgency="critical",
        importance=10,
        risk_level=0.92,
        budget_required=0.0,
        time_required=0.5,
        workforce_required=1,
        metadata={
            "alert": alert_data,
            "context": context,
            "available_actions_reasoning": {
                "approve_decision": "WRONG \u2014 Reckless approval.",
                "reject_decision": "PARTIALLY CORRECT \u2014 Stops immediate loss but misses audit/human review.",
                "escalate_issue": "CORRECT \u2014 Triggers human review, pauses system, creates audit trail.",
                "flag_risk": "INSUFFICIENT \u2014 Only marks for later review.",
            },
        },
        ground_truth_best_action="escalate_issue",
        explanation=expl,
    )

# ─────────────────────────────────────────────────────────────────────────────
# DOMAINS
# ─────────────────────────────────────────────────────────────────────────────

# 1. OPERATIONS
OP_T1 = create_prioritization_task("OP1", "Operations", "Production Line Failure", [], "", "")
OP_T2 = create_allocation_task("OP2", "Operations", "Workforce Allocation", [], {}, "", "")
OP_T3 = create_crisis_task("OP3", "Operations", "Infrastructure Bottleneck", {}, "", "")
OP_T4 = create_prioritization_task("OP4", "Operations", "Security Patch Scheduling", [], "", "")

# 2. FINANCE
FIN_T1 = create_prioritization_task("FIN1", "Finance", "Fraud Detection Alert", [], "", "")
FIN_T2 = create_allocation_task("FIN2", "Finance", "Suspicious Transaction Cluster", [], {}, "", "")
FIN_T3 = create_crisis_task("FIN3", "Finance", "Budget Allocation Conflict", {}, "", "")
FIN_T4 = create_prioritization_task("FIN4", "Finance", "Payment Approval Risk", [], "", "")

# 3. HEALTHCARE
HC_T1 = create_prioritization_task("HC1", "Healthcare", "Emergency Triage", [], "", "")
HC_T2 = create_allocation_task("HC2", "Healthcare", "ICU Bed Allocation", [], {}, "", "")
HC_T3 = create_crisis_task("HC3", "Healthcare", "Oxygen Supply Distribution", {}, "", "")
HC_T4 = create_prioritization_task("HC4", "Healthcare", "Ambulance Dispatch Conflict", [], "", "")

# 4. CYBERSECURITY
CYB_T1 = create_prioritization_task("CYB1", "Cybersecurity", "Active Ransomware Attack", [], "", "")
CYB_T2 = create_allocation_task("CYB2", "Cybersecurity", "DDoS Mitigation", [], {}, "", "")
CYB_T3 = create_crisis_task("CYB3", "Cybersecurity", "Suspicious Login Cluster", {}, "", "")
CYB_T4 = create_prioritization_task("CYB4", "Cybersecurity", "Security Incident Escalation", [], "", "")

# 5. LOGISTICS
LOG_T1 = create_prioritization_task("LOG1", "Logistics", "Perishable Goods Delay", [], "", "")
LOG_T2 = create_allocation_task("LOG2", "Logistics", "Fleet Route Conflict", [], {}, "", "")
LOG_T3 = create_crisis_task("LOG3", "Logistics", "Port Congestion", {}, "", "")
LOG_T4 = create_prioritization_task("LOG4", "Logistics", "Fuel Resource Allocation", [], "", "")

DOMAINS = {
    "Operations": [OP_T1, OP_T2, OP_T3, OP_T4],
    "Finance": [FIN_T1, FIN_T2, FIN_T3, FIN_T4],
    "Healthcare": [HC_T1, HC_T2, HC_T3, HC_T4],
    "Cybersecurity": [CYB_T1, CYB_T2, CYB_T3, CYB_T4],
    "Logistics": [LOG_T1, LOG_T2, LOG_T3, LOG_T4],
}

TASK_REGISTRY = DOMAINS["Operations"]

def get_tasks_for_domain(domain: str) -> list[TaskSchema]:
    return DOMAINS.get(domain, DOMAINS["Operations"])

