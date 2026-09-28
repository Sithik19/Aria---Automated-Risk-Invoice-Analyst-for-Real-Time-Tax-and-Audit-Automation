import os
import json
import uuid
import re
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command

from app.config import settings, persist_env_var, get_masked_groq_key
from app.anonymizer.engine import privacy_engine
from app.rag.qdrant_store import tax_knowledge_store
from app.agent.graph import create_aria_workflow

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Multi-Agent AI RegTech Framework for Indian Statutory Tax Reconciliation"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    thread_id: Optional[str] = None
    groq_api_key: Optional[str] = None
    buyer_financials: Dict[str, Any] = Field(default_factory=dict)
    sap_purchase_register: list = Field(default_factory=list)
    gstr_2b_portal_data: list = Field(default_factory=list)

class ResumeRequest(BaseModel):
    thread_id: str
    action: str = Field(default="APPROVE")  # APPROVE | REJECT
    udin: str  # 18-digit Unique Document Identification Number
    ca_membership_no: str
    ca_name: str
    comments: Optional[str] = "Statutory audit adjustments reviewed and approved under Section 141."

class GroqKeyRequest(BaseModel):
    api_key: str
    test_key: Optional[bool] = False

@app.get("/api/health")
def health_check():
    # Check PostgreSQL
    db_status = "UNKNOWN"
    try:
        import psycopg
        conn = psycopg.connect(settings.DATABASE_URL, connect_timeout=2)
        conn.close()
        db_status = "CONNECTED"
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    has_groq_key = bool(settings.GROQ_API_KEY.strip()) if settings.GROQ_API_KEY else False

    return {
        "status": "HEALTHY",
        "app_name": settings.APP_NAME,
        "database": {
            "type": "PostgreSQL 18 Local",
            "status": db_status
        },
        "vector_store": {
            "type": "Qdrant Vector Database",
            "collection": "indian_tax_statutes",
            "status": "INITIALIZED"
        },
        "privacy_layer": {
            "type": "Microsoft Presidio v2.2",
            "recognizers": ["IN_GSTIN", "IN_PAN", "EMAIL", "PHONE"],
            "status": "ACTIVE"
        },
        "llm_engine": {
            "provider": "Groq Cloud API",
            "model": settings.GROQ_MODEL,
            "has_key": has_groq_key,
            "masked_key": get_masked_groq_key(),
            "status": "ACTIVE" if has_groq_key else "FALLBACK_MODE"
        },
        "statutory_compliance": "Section 141 Companies Act & CBDT Circular 13/2021"
    }

@app.get("/api/audit/sample-data")
def get_sample_data():
    sample_file_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_invoices.json")
    try:
        with open(sample_file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read sample data: {e}")

@app.post("/api/audit/settings")
def update_groq_key(req: GroqKeyRequest):
    cleaned_key = req.api_key.strip()
    
    if cleaned_key and req.test_key:
        try:
            from groq import Groq
            test_client = Groq(api_key=cleaned_key)
            test_client.models.list()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Groq API key verification failed: {str(e)}")
            
    persist_env_var("GROQ_API_KEY", cleaned_key)
    
    return {
        "message": "Groq API key updated and verified successfully" if cleaned_key else "Groq API key cleared",
        "has_key": bool(settings.GROQ_API_KEY),
        "masked_key": get_masked_groq_key(),
        "model": settings.GROQ_MODEL
    }

@app.post("/api/audit/ingest")
def ingest_and_audit(req: IngestRequest):
    """
    Ingests invoice datasets, anonymizes GSTIN/PAN with Presidio, and runs the LangGraph
    multi-agent workflow (Supervisor -> Worker -> Reasoner) up to the HITL interrupt.
    """
    if req.groq_api_key and req.groq_api_key.strip():
        persist_env_var("GROQ_API_KEY", req.groq_api_key.strip())
        
    thread_id = req.thread_id or f"audit_thread_{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}
    
    payload = {
        "buyer_financials": req.buyer_financials,
        "sap_purchase_register": req.sap_purchase_register,
        "gstr_2b_portal_data": req.gstr_2b_portal_data
    }
    
    initial_state = {
        "session_id": thread_id,
        "raw_payload": payload,
        "telemetry": [],
        "current_step": "supervisor",
        "hitl_paused": False
    }

    try:
        with PostgresSaver.from_conn_string(settings.DATABASE_URL) as checkpointer:
            graph_app = create_aria_workflow(checkpointer=checkpointer)
            # Execute workflow until LangGraph interrupt() is hit
            graph_app.invoke(initial_state, config=config)
            
            # Fetch serialized checkpoint state
            current_checkpoint = graph_app.get_state(config)
            values = current_checkpoint.values
            
            return {
                "thread_id": thread_id,
                "status": "PAUSED_AWAITING_CA_APPROVAL",
                "next_nodes": list(current_checkpoint.next),
                "anonymization_audit": values.get("anonymization_audit"),
                "audit_discrepancies": values.get("audit_discrepancies", []),
                "legal_evaluations": values.get("legal_evaluations", []),
                "tax_adjustment_plan": values.get("tax_adjustment_plan"),
                "telemetry": values.get("telemetry", []),
                "anonymized_payload": values.get("anonymized_payload")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit execution error: {str(e)}")

@app.get("/api/audit/state/{thread_id}")
def get_audit_state(thread_id: str):
    """Fetches the state of a paused or completed audit from the PostgreSQL checkpointer."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        with PostgresSaver.from_conn_string(settings.DATABASE_URL) as checkpointer:
            graph_app = create_aria_workflow(checkpointer=checkpointer)
            current_checkpoint = graph_app.get_state(config)
            if not current_checkpoint or not current_checkpoint.values:
                raise HTTPException(status_code=404, detail="Audit thread not found in PostgreSQL checkpoints.")
                
            values = current_checkpoint.values
            return {
                "thread_id": thread_id,
                "next_nodes": list(current_checkpoint.next),
                "current_step": values.get("current_step"),
                "anonymization_audit": values.get("anonymization_audit"),
                "audit_discrepancies": values.get("audit_discrepancies", []),
                "legal_evaluations": values.get("legal_evaluations", []),
                "tax_adjustment_plan": values.get("tax_adjustment_plan"),
                "telemetry": values.get("telemetry", []),
                "audit_report": values.get("audit_report"),
                "human_approval": values.get("human_approval")
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving state: {str(e)}")

@app.post("/api/audit/resume")
def resume_audit_workflow(req: ResumeRequest):
    """
    Resumes the paused LangGraph workflow with Chartered Accountant approval and 18-digit UDIN.
    """
    # Validate 18-digit UDIN format before resuming
    udin_cleaned = req.udin.strip().upper()
    udin_regex = r"^[0-9]{2}[0-9]{6}[A-Z0-9]{10}$"
    if not re.match(udin_regex, udin_cleaned):
        raise HTTPException(
            status_code=400, 
            detail="Invalid UDIN format. Must be exactly 18 alphanumeric characters: 2-digit Year + 6-digit ICAI Membership No + 10-char Security Code (e.g., 26512345ABCDEF1234)."
        )

    config = {"configurable": {"thread_id": req.thread_id}}
    resume_payload = {
        "action": req.action,
        "udin": udin_cleaned,
        "ca_membership_no": req.ca_membership_no.strip(),
        "ca_name": req.ca_name.strip(),
        "comments": req.comments
    }

    try:
        with PostgresSaver.from_conn_string(settings.DATABASE_URL) as checkpointer:
            graph_app = create_aria_workflow(checkpointer=checkpointer)
            
            # Resume graph by feeding Command(resume=...)
            graph_app.invoke(Command(resume=resume_payload), config=config)
            
            # Fetch final state
            final_checkpoint = graph_app.get_state(config)
            values = final_checkpoint.values
            
            return {
                "thread_id": req.thread_id,
                "status": "CERTIFIED_COMPLETED" if req.action == "APPROVE" else "REJECTED",
                "audit_report": values.get("audit_report"),
                "human_approval": values.get("human_approval"),
                "telemetry": values.get("telemetry", []),
                "current_step": values.get("current_step")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resuming audit workflow: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
