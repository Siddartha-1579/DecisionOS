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
OP_T1 = create_prioritization_task("OP-T1", "Operations", "Production DB Outage vs Feature Requests", 
    [{"task_id": "T1A", "urgency": "low"}, {"task_id": "T1B", "urgency": "critical", "title": "DB Outage"}],
    "Revenue-generating DB is degraded. Customer-facing services down.",
    "DB outage must be prioritized to avoid cascading revenue damage.")
OP_T2 = create_allocation_task("OP-T2", "Operations", "Sprint Budget Allocation",
    [{"project_id": "P1", "name": "Security patch"}], {},
    "Sprint allocation. Security patch is critical.",
    "Optimal allocation handles security first.")
OP_T3 = create_crisis_task("OP-T3", "Operations", "Payment Gateway Failure",
    {"type": "gateway_outage"}, "Payment gateway is throwing 500s rapidly.",
    "escalate_issue is correct to trigger emergency engineering review.")

# 2. FINANCE
FIN_T1 = create_prioritization_task("FIN-T1", "Finance", "Fraud Alerts vs System Updates",
    [{"task_id": "T1A", "urgency": "low"}, {"task_id": "T1B", "urgency": "critical", "title": "High-Value Fraud"}],
    "Massive fraud detected. Needs immediate halt.",
    "Fraud must be prioritized.")
FIN_T2 = create_allocation_task("FIN-T2", "Finance", "Q3 Budget Deployment",
    [{"project_id": "P1", "name": "Compliance Audit"}], {},
    "Deploying funds for Q3. Compliance is non-negotiable.",
    "Optimal allocation handles compliance first.")
FIN_T3 = create_crisis_task("FIN-T3", "Finance", "Suspicious Payment Cluster",
    {"type": "fraud_cluster", "ml_fraud_score": 0.94}, "ML model flags a cluster of 47 transactions.",
    "escalate_issue is correct to trigger fraud review team.")

# 3. HEALTHCARE
HC_T1 = create_prioritization_task("HC-T1", "Healthcare", "Emergency Triage vs Routine Checkup",
    [{"task_id": "T1A", "urgency": "low"}, {"task_id": "T1B", "urgency": "critical", "title": "Cardiac Arrest"}],
    "Patient presenting with cardiac arrest vs routine physicals.",
    "Cardiac arrest must be prioritized.")
HC_T2 = create_allocation_task("HC-T2", "Healthcare", "ICU Bed Distribution",
    [{"project_id": "P1", "name": "Critical Care Unit"}], {},
    "Allocating limited ICU beds for incoming trauma patients.",
    "Optimal allocation handles trauma first.")
HC_T3 = create_crisis_task("HC-T3", "Healthcare", "Oxygen Supply Shortage",
    {"type": "supply_shortage"}, "Main oxygen tank pressure dropping unexpectedly.",
    "escalate_issue is correct to trigger emergency hospital protocol.")

# 4. CYBERSECURITY
CYB_T1 = create_prioritization_task("CYB-T1", "Cybersecurity", "DDoS Mitigation vs Log Review",
    [{"task_id": "T1A", "urgency": "low"}, {"task_id": "T1B", "urgency": "critical", "title": "Active DDoS"}],
    "Active DDoS attack flooding main ingress.",
    "DDoS must be prioritized.")
CYB_T2 = create_allocation_task("CYB-T2", "Cybersecurity", "Incident Response Team Dispatch",
    [{"project_id": "P1", "name": "Containment"}], {},
    "Dispatching engineers to contain an ongoing breach.",
    "Optimal allocation handles containment first.")
CYB_T3 = create_crisis_task("CYB-T3", "Cybersecurity", "Active Ransomware Encryption Detected",
    {"type": "ransomware"}, "File encryption detected on domain controllers.",
    "escalate_issue is correct to trigger immediate network quarantine and SOC escalation.")

# 5. LOGISTICS
LOG_T1 = create_prioritization_task("LOG-T1", "Logistics", "Perishable Goods vs Standard Cargo",
    [{"task_id": "T1A", "urgency": "low"}, {"task_id": "T1B", "urgency": "critical", "title": "Perishables Delay"}],
    "Refrigeration failure on a perishable goods container.",
    "Perishable goods must be prioritized.")
LOG_T2 = create_allocation_task("LOG-T2", "Logistics", "Fleet Routing & Driver Shifts",
    [{"project_id": "P1", "name": "Express Delivery"}], {},
    "Allocating available drivers to critical routes.",
    "Optimal allocation handles express first.")
LOG_T3 = create_crisis_task("LOG-T3", "Logistics", "Port Strike Causing Massive Delay",
    {"type": "port_strike"}, "Unexpected worker strike at main port.",
    "escalate_issue is correct to trigger rerouting logistics chain.")

DOMAINS = {
    "Operations": [OP_T1, OP_T2, OP_T3],
    "Finance": [FIN_T1, FIN_T2, FIN_T3],
    "Healthcare": [HC_T1, HC_T2, HC_T3],
    "Cybersecurity": [CYB_T1, CYB_T2, CYB_T3],
    "Logistics": [LOG_T1, LOG_T2, LOG_T3],
}

TASK_REGISTRY = DOMAINS["Operations"]

def get_tasks_for_domain(domain: str) -> list[TaskSchema]:
    return DOMAINS.get(domain, DOMAINS["Operations"])
