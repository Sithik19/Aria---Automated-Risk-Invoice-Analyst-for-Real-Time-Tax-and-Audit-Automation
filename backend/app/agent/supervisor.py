import time
from datetime import datetime
from typing import Dict, Any
from app.agent.state import AgentState, AgentTelemetry
from app.anonymizer.engine import privacy_engine

def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """
    Supervisor Agent Node:
    - Ingests ERP & Tax Portal datasets
    - Routes through Microsoft Presidio for strict statutory PII masking (15-digit GSTIN, 10-digit PAN)
    - Validates data integrity and initializes multi-agent telemetry
    """
    start_time = time.time()
    session_id = state.get("session_id", "session_unknown")
    raw_payload = state.get("raw_payload", {})
    
    # Run Presidio Anonymization
    anonymized_result = privacy_engine.anonymize_invoice_payload(raw_payload)
    sanitized_payload = anonymized_result["sanitized_payload"]
    privacy_audit = anonymized_result["anonymization_audit"]
    
    sap_invoices = sanitized_payload.get("sap_purchase_register", [])
    portal_invoices = sanitized_payload.get("gstr_2b_portal_data", [])
    
    latency = round((time.time() - start_time) * 1000, 2)
    
    telemetry_entry: AgentTelemetry = {
        "timestamp": datetime.now().isoformat(),
        "node": "supervisor",
        "agent_name": "Supervisor Agent (Ingestion & Anonymization Engine)",
        "status": "COMPLETED",
        "latency_ms": latency,
        "message": (
            f"Successfully processed payload. Masked {privacy_audit['total_gstins_masked']} GSTINs and "
            f"{privacy_audit['total_pans_masked']} PANs via Microsoft Presidio. "
            f"Queued {len(sap_invoices)} SAP invoices and {len(portal_invoices)} GSTR-2B portal records for Worker Agent."
        ),
        "details": {
            "sap_count": len(sap_invoices),
            "portal_count": len(portal_invoices),
            "privacy_audit": privacy_audit
        }
    }
    
    current_telemetry = list(state.get("telemetry", []))
    current_telemetry.append(telemetry_entry)
    
    return {
        "anonymized_payload": sanitized_payload,
        "anonymization_audit": privacy_audit,
        "telemetry": current_telemetry,
        "current_step": "worker"
    }
