from typing import TypedDict, List, Dict, Any, Optional

class AgentTelemetry(TypedDict):
    timestamp: str
    node: str
    agent_name: str
    status: str
    latency_ms: float
    message: str
    details: Dict[str, Any]

class AuditDiscrepancy(TypedDict):
    invoice_number: str
    discrepancy_type: str  # e.g., 'TAXABLE_VALUE_MISMATCH', 'TAX_RATE_MISMATCH', 'MISSING_IN_GSTR2B', 'UNBOOKED_INVOICE'
    severity: str  # 'HIGH', 'MEDIUM', 'LOW'
    sap_record: Optional[Dict[str, Any]]
    portal_record: Optional[Dict[str, Any]]
    delta_taxable_value: float
    delta_tax_amount: float
    itc_impact: str  # 'INELIGIBLE_ITC', 'EXCESS_CLAIM', 'POTENTIAL_CLAIM'
    statutory_note: str

class LegalEvaluation(TypedDict):
    statutory_clause: str
    precedence_rule: str
    rationale: str
    rag_citation: str
    action_required: str
    financial_impact_inr: float

class TaxAdjustmentPlan(TypedDict):
    total_itc_claimed_in_sap: float
    total_itc_reflected_in_2b: float
    ineligible_itc_to_reverse: float
    excess_itc_claimed: float
    unbooked_itc_to_claim: float
    section_194q_tds_payable: float
    section_206c_tcs_to_be_reversed_by_seller: float
    section_50_interest_liability: float
    net_tax_liability_inr: float
    adjustments_summary: List[str]

class HumanApprovalDecision(TypedDict):
    action: str  # 'APPROVE' | 'REJECT'
    udin: str  # 18-character UDIN
    ca_membership_no: str
    ca_name: str
    comments: str
    approval_timestamp: str

class AgentState(TypedDict):
    session_id: str
    raw_payload: Dict[str, Any]
    anonymized_payload: Dict[str, Any]
    anonymization_audit: Dict[str, Any]
    
    # Audit Analysis
    audit_discrepancies: List[AuditDiscrepancy]
    legal_evaluations: List[LegalEvaluation]
    tax_adjustment_plan: Optional[TaxAdjustmentPlan]
    
    # Execution Tracking
    telemetry: List[AgentTelemetry]
    current_step: str  # 'supervisor' | 'worker' | 'reasoner' | 'paused_hitl' | 'approved' | 'rejected'
    
    # Human-in-the-Loop Gateway
    hitl_paused: bool
    human_approval: Optional[HumanApprovalDecision]
    
    # Final Output
    audit_report: Optional[Dict[str, Any]]
