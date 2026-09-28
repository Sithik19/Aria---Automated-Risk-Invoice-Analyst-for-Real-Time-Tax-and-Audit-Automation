import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.config import settings
from app.agent.state import AgentState, LegalEvaluation, TaxAdjustmentPlan, AgentTelemetry
from app.rag.qdrant_store import tax_knowledge_store

logger = logging.getLogger("aria.reasoner")

def get_groq_client(api_key: Optional[str] = None):
    """
    Dynamically initializes and returns the Groq client using the currently configured API key.
    Ensures that any API key provided at runtime or in settings is immediately active without server restarts.
    """
    key = (api_key or settings.GROQ_API_KEY or "").strip()
    if not key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=key)
    except Exception as e:
        logger.warning(f"Failed to initialize Groq client: {e}")
        return None

def reasoner_node(state: AgentState) -> Dict[str, Any]:
    """
    Reasoning Agent Node:
    - Queries Qdrant vector database for relevant statutory provisions (CBDT Circular 13/2021, CGST Sec 16(2)(aa), Sec 50(1))
    - Uses Groq API (Llama 3.3 70B) or high-fidelity statutory logic fallback for cross-domain legal tax decisions
    - Formulates the comprehensive Tax Adjustment Plan for the Chartered Accountant
    """
    start_time = time.time()
    payload = state.get("anonymized_payload", {})
    discrepancies = state.get("audit_discrepancies", [])
    buyer_financials = payload.get("buyer_financials", {})
    sap_invoices = payload.get("sap_purchase_register", [])
    portal_invoices = payload.get("gstr_2b_portal_data", [])
    
    buyer_turnover_cr = float(buyer_financials.get("turnover_preceding_fy_inr_cr", 15.0))
    buyer_eligible_194q = buyer_turnover_cr > 10.0
    
    legal_evaluations: List[LegalEvaluation] = []
    
    # Check for active Groq Client
    groq_client = get_groq_client()
    groq_active = False
    active_llm_name = "ARIA-Autonomous-Statutory-Reasoner"
    
    # -------------------------------------------------------------
    # 1. Evaluate Section 194Q TDS vs Section 206C(1H) TCS Conflict
    # -------------------------------------------------------------
    qdrant_194q_results = tax_knowledge_store.search_statutes(
        "CBDT Circular 13 2021 Section 194Q TDS precedence over Section 206C TCS threshold", 
        limit=2
    )
    rag_194q_citation = qdrant_194q_results[0]["citation"] if qdrant_194q_results else "CBDT Circular No. 13/2021"
    rag_194q_text = qdrant_194q_results[0]["content"] if qdrant_194q_results else ""

    tds_194q_payable = 0.0
    tcs_206c_to_reverse = 0.0

    # Check high-value supplier transactions
    vendor_totals: Dict[str, float] = {}
    for inv in sap_invoices:
        supp = inv.get("supplier_gstin", "UNKNOWN")
        val = float(inv.get("taxable_value", 0.0))
        vendor_totals[supp] = vendor_totals.get(supp, 0.0) + val
        
        # Check if seller collected TCS
        tcs_val = float(inv.get("tcs_collected", 0.0))
        if tcs_val > 0:
            tcs_206c_to_reverse += tcs_val

    # If vendor total exceeds ₹50 Lakhs (5,000,000) and buyer turnover > 10 Cr:
    for supp, total_val in vendor_totals.items():
        if total_val > 5000000.0 and buyer_eligible_194q:
            excess_amount = total_val - 5000000.0
            tds_rate = 0.001  # 0.1% TDS under 194Q
            calculated_tds = round(excess_amount * tds_rate, 2)
            tds_194q_payable += calculated_tds

    groq_reasoning_summary = ""
    if groq_client:
        try:
            prompt = (
                f"You are a Senior Indian Tax Statutory Auditor. Evaluate the following statutory tax situation:\n"
                f"Buyer turnover in preceding FY: ₹{buyer_turnover_cr} Crores (> ₹10 Cr).\n"
                f"Supplier cumulative purchases: ₹{max(vendor_totals.values() or [0.0]):,.2f} (> ₹50 Lakhs).\n"
                f"Seller charged TCS under Section 206C(1H) of ₹{tcs_206c_to_reverse:,.2f}.\n"
                f"Statutory Context from Qdrant: {rag_194q_text}\n"
                "State the precedence decision under Section 194Q(5) and CBDT Circular 13/2021 in 2 clear, authoritative sentences."
            )
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=settings.GROQ_MODEL,
                temperature=0.1,
                max_tokens=250,
            )
            groq_reasoning_summary = chat_completion.choices[0].message.content or ""
            if groq_reasoning_summary:
                groq_active = True
                active_llm_name = f"Groq Cloud ({settings.GROQ_MODEL})"
        except Exception as e:
            logger.warning(f"Groq API call failed, falling back to autonomous reasoner: {e}")
            groq_reasoning_summary = ""

    if not groq_reasoning_summary:
        groq_reasoning_summary = (
            f"Under Section 194Q(5) read with CBDT Circular No. 13/2021, since the buyer's turnover exceeds ₹10 Cr "
            f"(₹{buyer_turnover_cr} Cr), Section 194Q TDS takes strict statutory precedence over Section 206C(1H) TCS. "
            f"The buyer must withhold 0.1% TDS on value exceeding ₹50 Lakhs (TDS liability: ₹{tds_194q_payable:,.2f}) "
            f"and issue a debit note to the seller to reverse the wrongly collected TCS of ₹{tcs_206c_to_reverse:,.2f}."
        )

    legal_evaluations.append({
        "statutory_clause": "Section 194Q vs Section 206C(1H) of Income-tax Act, 1961",
        "precedence_rule": "Section 194Q TDS prevails over Section 206C(1H) TCS",
        "rationale": groq_reasoning_summary,
        "rag_citation": rag_194q_citation,
        "action_required": "Deduct 0.1% TDS under Section 194Q and issue TCS Reversal Notice to Vendor",
        "financial_impact_inr": round(tds_194q_payable - tcs_206c_to_reverse, 2)
    })

    # -------------------------------------------------------------
    # 2. Evaluate Ineligible ITC (Section 16(2)(aa) & Rule 36(4))
    # -------------------------------------------------------------
    qdrant_itc_results = tax_knowledge_store.search_statutes(
        "Section 16 2 aa CGST Act Rule 36 4 ITC matching missing GSTR 2B reversal",
        limit=1
    )
    rag_itc_citation = qdrant_itc_results[0]["citation"] if qdrant_itc_results else "CGST Notification 39/2021"

    missing_in_2b_itc = sum(d["delta_tax_amount"] for d in discrepancies if d["discrepancy_type"] == "MISSING_IN_GSTR2B")
    excess_claimed_itc = sum(d["delta_tax_amount"] for d in discrepancies if d["discrepancy_type"] == "TAXABLE_VALUE_MISMATCH" and d["delta_tax_amount"] > 0)
    unbooked_portal_itc = sum(abs(d["delta_tax_amount"]) for d in discrepancies if d["discrepancy_type"] == "UNBOOKED_INVOICE_IN_2B")
    
    total_itc_to_reverse = round(missing_in_2b_itc + excess_claimed_itc, 2)
    
    legal_evaluations.append({
        "statutory_clause": "Section 16(2)(aa) of CGST Act read with Rule 36(4)",
        "precedence_rule": "ITC Claim strictly contingent upon GSTR-2B reflection",
        "rationale": (
            f"Statutory mandate disallows ₹{total_itc_to_reverse:,.2f} of Input Tax Credit due to non-furnishing "
            "by suppliers in GSTR-1/2B. Must be reversed under Table 4(B)(2) of Form GSTR-3B."
        ),
        "rag_citation": rag_itc_citation,
        "action_required": "Reverse unauthorized ITC in GSTR-3B Table 4(B)(2) and seek supplier filing confirmation",
        "financial_impact_inr": total_itc_to_reverse
    })

    # -------------------------------------------------------------
    # 3. Evaluate Interest Liability (Section 50(1) CGST Act)
    # -------------------------------------------------------------
    qdrant_interest_results = tax_knowledge_store.search_statutes(
        "Section 50 1 CGST Act interest rate 18 percent wrongful ITC utilization",
        limit=1
    )
    rag_interest_citation = qdrant_interest_results[0]["citation"] if qdrant_interest_results else "Finance Act 2022"
    
    # Calculate 18% annual interest for estimated 90 days delay
    interest_days = 90
    interest_liability = round((total_itc_to_reverse * 0.18 * interest_days) / 365.0, 2)

    legal_evaluations.append({
        "statutory_clause": "Section 50(1) of CGST Act read with Rule 88B",
        "precedence_rule": "Mandatory 18% p.a. interest on utilized ineligible ITC",
        "rationale": (
            f"In accordance with Section 50(1), interest at 18% p.a. is assessed on ₹{total_itc_to_reverse:,.2f} "
            f"for an estimated {interest_days} days of wrongful availment and utilization."
        ),
        "rag_citation": rag_interest_citation,
        "action_required": "Pay interest via DRC-03 or Electronic Cash Ledger upon GSTR-3B reversal",
        "financial_impact_inr": interest_liability
    })

    # -------------------------------------------------------------
    # 4. Synthesize Tax Adjustment Plan
    # -------------------------------------------------------------
    total_sap_itc = sum(float(x.get("igst", 0.0)) + float(x.get("cgst", 0.0)) + float(x.get("sgst", 0.0)) for x in sap_invoices)
    total_portal_itc = sum(float(x.get("igst", 0.0)) + float(x.get("cgst", 0.0)) + float(x.get("sgst", 0.0)) for x in portal_invoices)
    net_tax_liability = round(total_itc_to_reverse + interest_liability + tds_194q_payable - tcs_206c_to_reverse, 2)

    adjustment_plan: TaxAdjustmentPlan = {
        "total_itc_claimed_in_sap": round(total_sap_itc, 2),
        "total_itc_reflected_in_2b": round(total_portal_itc, 2),
        "ineligible_itc_to_reverse": round(missing_in_2b_itc, 2),
        "excess_itc_claimed": round(excess_claimed_itc, 2),
        "unbooked_itc_to_claim": round(unbooked_portal_itc, 2),
        "section_194q_tds_payable": round(tds_194q_payable, 2),
        "section_206c_tcs_to_be_reversed_by_seller": round(tcs_206c_to_reverse, 2),
        "section_50_interest_liability": round(interest_liability, 2),
        "net_tax_liability_inr": net_tax_liability,
        "adjustments_summary": [
            f"Reverse ₹{total_itc_to_reverse:,.2f} ineligible ITC under Section 16(2)(aa) in GSTR-3B Table 4(B)(2).",
            f"Deposit ₹{tds_194q_payable:,.2f} TDS under Section 194Q via Challan ITNS 281.",
            f"Recover ₹{tcs_206c_to_reverse:,.2f} from vendor as debit note for overridden Section 206C(1H) TCS.",
            f"Remit ₹{interest_liability:,.2f} interest under Section 50(1) at 18% per annum.",
            f"Record book entry for ₹{unbooked_portal_itc:,.2f} unbooked GSTR-2B invoices to unlock eligible ITC."
        ]
    }

    latency = round((time.time() - start_time) * 1000, 2)
    
    engine_desc = f"Groq Llama 3.3 ({settings.GROQ_MODEL})" if groq_active else "Autonomous Statutory Reasoner"
    telemetry_entry: AgentTelemetry = {
        "timestamp": datetime.now().isoformat(),
        "node": "reasoner",
        "agent_name": f"Reasoning Agent ({engine_desc})",
        "status": "COMPLETED",
        "latency_ms": latency,
        "message": (
            f"Synthesized cross-domain legal tax opinions via Qdrant & {engine_desc}. "
            f"Resolved Section 194Q vs 206C(1H) precedence. "
            f"Computed ₹{net_tax_liability:,.2f} net statutory adjustments. Pausing for Section 141 CA Approval."
        ),
        "details": {
            "legal_clauses_evaluated": len(legal_evaluations),
            "net_tax_liability": net_tax_liability,
            "qdrant_statutes_matched": [e["statutory_clause"] for e in legal_evaluations],
            "llm_model": active_llm_name,
            "groq_active": groq_active
        }
    }
    
    current_telemetry = list(state.get("telemetry", []))
    current_telemetry.append(telemetry_entry)

    return {
        "legal_evaluations": legal_evaluations,
        "tax_adjustment_plan": adjustment_plan,
        "telemetry": current_telemetry,
        "current_step": "paused_hitl",
        "hitl_paused": True
    }
