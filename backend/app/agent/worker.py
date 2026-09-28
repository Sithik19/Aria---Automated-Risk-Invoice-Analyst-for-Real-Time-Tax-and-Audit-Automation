import time
import re
from datetime import datetime
from typing import Dict, Any, List
from app.agent.state import AgentState, AuditDiscrepancy, AgentTelemetry

def normalize_inv_num(num: str) -> str:
    if not num:
        return ""
    # Strip spaces, slashes, dashes, leading zeroes
    cleaned = re.sub(r"[\s\-\/_]", "", str(num)).upper()
    return cleaned

def worker_node(state: AgentState) -> Dict[str, Any]:
    """
    Worker Agent Node:
    - Performs high-speed quantitative mismatch checks between internal SAP Purchase Registers
      and external GSTR-2B tax portal filings.
    - Flags value variances, tax rate variances, missing portal invoices, and unbooked supplies.
    """
    start_time = time.time()
    payload = state.get("anonymized_payload", {})
    sap_invoices = payload.get("sap_purchase_register", [])
    portal_invoices = payload.get("gstr_2b_portal_data", [])
    
    portal_map: Dict[str, Dict[str, Any]] = {}
    for inv in portal_invoices:
        norm_num = normalize_inv_num(inv.get("invoice_number", ""))
        portal_map[norm_num] = inv
        
    matched_portal_keys = set()
    discrepancies: List[AuditDiscrepancy] = []
    
    # 1. Analyze SAP invoices against GSTR-2B
    for sap_inv in sap_invoices:
        inv_no = sap_inv.get("invoice_number", "")
        norm_no = normalize_inv_num(inv_no)
        sap_taxable = float(sap_inv.get("taxable_value", 0.0))
        sap_tax = float(sap_inv.get("igst", 0.0)) + float(sap_inv.get("cgst", 0.0)) + float(sap_inv.get("sgst", 0.0))
        
        if norm_no in portal_map:
            matched_portal_keys.add(norm_no)
            portal_inv = portal_map[norm_no]
            portal_taxable = float(portal_inv.get("taxable_value", 0.0))
            portal_tax = float(portal_inv.get("igst", 0.0)) + float(portal_inv.get("cgst", 0.0)) + float(portal_inv.get("sgst", 0.0))
            
            delta_taxable = round(sap_taxable - portal_taxable, 2)
            delta_tax = round(sap_tax - portal_tax, 2)
            
            # Check for value or tax discrepancy (tolerance ₹5.00 for rounding)
            if abs(delta_taxable) > 5.0 or abs(delta_tax) > 5.0:
                disc_type = "TAXABLE_VALUE_MISMATCH" if abs(delta_taxable) > 5.0 else "TAX_AMOUNT_MISMATCH"
                severity = "HIGH" if abs(delta_tax) > 10000 else "MEDIUM"
                itc_impact = "EXCESS_CLAIM" if delta_tax > 0 else "POTENTIAL_CLAIM"
                
                discrepancies.append({
                    "invoice_number": inv_no,
                    "discrepancy_type": disc_type,
                    "severity": severity,
                    "sap_record": sap_inv,
                    "portal_record": portal_inv,
                    "delta_taxable_value": delta_taxable,
                    "delta_tax_amount": delta_tax,
                    "itc_impact": itc_impact,
                    "statutory_note": (
                        f"SAP registers tax of ₹{sap_tax:,.2f} vs GSTR-2B portal of ₹{portal_tax:,.2f}. "
                        f"Variance of ₹{delta_tax:,.2f} must be reconciled under Rule 36(4)."
                    )
                })
        else:
            # Invoice in SAP books but absent from GSTR-2B
            discrepancies.append({
                "invoice_number": inv_no,
                "discrepancy_type": "MISSING_IN_GSTR2B",
                "severity": "HIGH",
                "sap_record": sap_inv,
                "portal_record": None,
                "delta_taxable_value": sap_taxable,
                "delta_tax_amount": sap_tax,
                "itc_impact": "INELIGIBLE_ITC",
                "statutory_note": (
                    f"Invoice {inv_no} exists in SAP books (ITC: ₹{sap_tax:,.2f}) but is NOT reflected in GSTR-2B. "
                    "Under Section 16(2)(aa) of CGST Act, Input Tax Credit cannot be claimed in GSTR-3B."
                )
            })

    # 2. Check for unbooked invoices in GSTR-2B
    for norm_no, portal_inv in portal_map.items():
        if norm_no not in matched_portal_keys:
            portal_taxable = float(portal_inv.get("taxable_value", 0.0))
            portal_tax = float(portal_inv.get("igst", 0.0)) + float(portal_inv.get("cgst", 0.0)) + float(portal_inv.get("sgst", 0.0))
            inv_no = portal_inv.get("invoice_number", "UNKNOWN")
            
            discrepancies.append({
                "invoice_number": inv_no,
                "discrepancy_type": "UNBOOKED_INVOICE_IN_2B",
                "severity": "MEDIUM",
                "sap_record": None,
                "portal_record": portal_inv,
                "delta_taxable_value": -portal_taxable,
                "delta_tax_amount": -portal_tax,
                "itc_impact": "POTENTIAL_CLAIM",
                "statutory_note": (
                    f"Supplier reported invoice {inv_no} in GSTR-1 (ITC: ₹{portal_tax:,.2f}), but it is missing from SAP books. "
                    "Eligible credit pending book entry."
                )
            })

    latency = round((time.time() - start_time) * 1000, 2)
    
    telemetry_entry: AgentTelemetry = {
        "timestamp": datetime.now().isoformat(),
        "node": "worker",
        "agent_name": "Worker Agent (Quantitative Reconciliation Engine)",
        "status": "COMPLETED",
        "latency_ms": latency,
        "message": (
            f"Executed quantitative reconciliation. Scanned {len(sap_invoices)} SAP entries against "
            f"{len(portal_invoices)} portal records. Identified {len(discrepancies)} statutory discrepancies."
        ),
        "details": {
            "total_discrepancies": len(discrepancies),
            "missing_in_2b": sum(1 for d in discrepancies if d["discrepancy_type"] == "MISSING_IN_GSTR2B"),
            "value_mismatches": sum(1 for d in discrepancies if d["discrepancy_type"] == "TAXABLE_VALUE_MISMATCH"),
            "unbooked_invoices": sum(1 for d in discrepancies if d["discrepancy_type"] == "UNBOOKED_INVOICE_IN_2B")
        }
    }
    
    current_telemetry = list(state.get("telemetry", []))
    current_telemetry.append(telemetry_entry)
    
    return {
        "audit_discrepancies": discrepancies,
        "telemetry": current_telemetry,
        "current_step": "reasoner"
    }
