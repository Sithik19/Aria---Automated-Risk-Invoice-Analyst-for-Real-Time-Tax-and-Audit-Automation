"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw,
  Key,
  CheckCircle2,
  FileSpreadsheet,
  FileCheck,
  Scale,
  ShieldCheck,
  Terminal,
  Activity
} from "lucide-react";

import CAApprovalGateway from "@/components/CAApprovalGateway";
import PresidioInspector from "@/components/PresidioInspector";
import ReconciliationMatrix from "@/components/ReconciliationMatrix";
import LegalReasoningDossier from "@/components/LegalReasoningDossier";
import AuditReportCertificate from "@/components/AuditReportCertificate";
import TelemetryStream from "@/components/TelemetryStream";

// Dynamically import 3D canvas with SSR disabled
const ThreeAgentMesh = dynamic(() => import("@/components/ThreeAgentMesh"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-xl glass-panel flex flex-col items-center justify-center gap-3 text-cyan-400 font-mono text-xs">
      <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span>Initializing 3D Multi-Agent React Three Fiber Scene...</span>
    </div>
  ),
});

const BACKEND_URL = "http://127.0.0.1:8000";

export default function AriaDashboard() {
  const [activeTab, setActiveTab] = useState<"matrix" | "dossier" | "presidio" | "telemetry">("matrix");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // System & Health State
  const [health, setHealth] = useState<any>(null);
  const [groqKeyModalOpen, setGroqKeyModalOpen] = useState(false);
  const [groqApiKeyInput, setGroqApiKeyInput] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Audit Workflow State
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Ingestion & Audit Data
  const [sampleData, setSampleData] = useState<any>(null);
  const [anonymizationAudit, setAnonymizationAudit] = useState<any>(null);
  const [anonymizedPayload, setAnonymizedPayload] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [legalEvaluations, setLegalEvaluations] = useState<any[]>([]);
  const [adjustmentPlan, setAdjustmentPlan] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [humanApproval, setHumanApproval] = useState<any>(null);

  // Load Health & Sample Data on Mount
  useEffect(() => {
    fetchHealth();
    fetchSampleData();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error("Health check error:", e);
    }
  };

  const fetchSampleData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/sample-data`);
      if (res.ok) {
        const data = await res.json();
        setSampleData(data);
      }
    } catch (e) {
      console.error("Sample data fetch error:", e);
    }
  };

  const saveGroqKey = async () => {
    if (isSavingKey) return;
    setIsSavingKey(true);
    setKeyFeedback(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: groqApiKeyInput, test_key: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setKeyFeedback({ type: "success", message: data.message || "Groq API key saved successfully." });
        fetchHealth();
        setTimeout(() => {
          setGroqKeyModalOpen(false);
          setKeyFeedback(null);
        }, 1500);
      } else {
        setKeyFeedback({ type: "error", message: data.detail || "Failed to save Groq API key." });
      }
    } catch (e) {
      setKeyFeedback({ type: "error", message: "Could not reach backend. Ensure the server is running on port 8000." });
      console.error("Error saving Groq key:", e);
    } finally {
      setIsSavingKey(false);
    }
  };

  const clearGroqKey = async () => {
    setIsSavingKey(true);
    setKeyFeedback(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "" }),
      });
      if (res.ok) {
        setGroqApiKeyInput("");
        setKeyFeedback({ type: "success", message: "Groq API key cleared. Fallback statutory engine active." });
        fetchHealth();
        setTimeout(() => setKeyFeedback(null), 2000);
      }
    } catch (e) {
      console.error("Error clearing Groq key:", e);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Run LangGraph Multi-Agent Pipeline up to HITL Interrupt
  const handleStartReconciliation = async () => {
    if (!sampleData) return;
    setIsExecuting(true);
    setCurrentStep("supervisor");

    try {
      // Simulate rapid progressive visual states for 3D scene animation
      setTimeout(() => setCurrentStep("worker"), 700);
      setTimeout(() => setCurrentStep("reasoner"), 1400);

      const res = await fetch(`${BACKEND_URL}/api/audit/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_financials: sampleData.buyer_financials,
          sap_purchase_register: sampleData.sap_purchase_register,
          gstr_2b_portal_data: sampleData.gstr_2b_portal_data,
        }),
      });

      if (!res.ok) {
        throw new Error("Audit ingestion failed");
      }

      const data = await res.json();
      setThreadId(data.thread_id);
      setAnonymizationAudit(data.anonymization_audit);
      setAnonymizedPayload(data.anonymized_payload);
      setDiscrepancies(data.audit_discrepancies || []);
      setLegalEvaluations(data.legal_evaluations || []);
      setAdjustmentPlan(data.tax_adjustment_plan);
      setTelemetry(data.telemetry || []);
      setCurrentStep("paused_hitl");
    } catch (error) {
      console.error("Workflow failed:", error);
      setCurrentStep("idle");
    } finally {
      setIsExecuting(false);
    }
  };

  // Resume workflow with CA UDIN approval
  const handleResumeWorkflow = async ({
    threadId: tId,
    action,
    udin,
    caMembershipNo,
    caName,
    comments,
  }: {
    threadId: string;
    action: "APPROVE" | "REJECT";
    udin: string;
    caMembershipNo: string;
    caName: string;
    comments: string;
  }) => {
    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: tId,
          action,
          udin,
          ca_membership_no: caMembershipNo,
          ca_name: caName,
          comments,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.detail || "Verification failed"}`);
        return;
      }

      const data = await res.json();
      setFinalReport(data.audit_report);
      setHumanApproval(data.human_approval);
      setTelemetry(data.telemetry || []);
      setCurrentStep(action === "APPROVE" ? "completed" : "rejected");
    } catch (e) {
      console.error("Resume error:", e);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const resetAudit = () => {
    setThreadId(null);
    setCurrentStep("idle");
    setFinalReport(null);
    setHumanApproval(null);
    setDiscrepancies([]);
    setLegalEvaluations([]);
    setAdjustmentPlan(null);
    setTelemetry([]);
    fetchSampleData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060911] text-slate-100">
      {/* Top Futuristic Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full rounded-[10px] bg-[#090d16] flex items-center justify-center">
              <Scale className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-slate-100 font-mono">
                ARIA
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                RegTech v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Automated Reconciliation & Intelligent Auditing • Indian Statutory Engine
            </p>
          </div>
        </div>

        {/* Live Connectivity Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          {/* PostgreSQL */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Postgres 18:</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>

          {/* Qdrant */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Qdrant RAG:</span>
            <span className="text-purple-400 font-bold">READY</span>
          </div>

          {/* Presidio */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Presidio PII:</span>
            <span className="text-cyan-400 font-bold">ENFORCED</span>
          </div>

          {/* Groq Cloud */}
          <button
            onClick={() => setGroqKeyModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-slate-300 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Groq LLM:</span>
            <span className="text-amber-400 font-bold">
              {health?.llm_engine?.has_key ? "API ACTIVE" : "CONFIG KEY"}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Pipeline Control Header & Ingestion Status */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                Target Entity:
              </span>
              <span className="text-sm font-bold text-slate-200">
                {sampleData?.buyer_financials?.company_name || "AURA INDUSTRIAL TECH SOLUTIONS LIMITED"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span>FY Turnover: ₹{sampleData?.buyer_financials?.turnover_preceding_fy_inr_cr || "42.50"} Cr (&gt; ₹10 Cr)</span>
              <span>•</span>
              <span>Period: {sampleData?.buyer_financials?.current_period || "Q3-FY2025-26"}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">TDS Sec 194Q Applicable</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {currentStep === "idle" ? (
              <button
                onClick={handleStartReconciliation}
                disabled={isExecuting || !sampleData}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-slate-950 font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{isExecuting ? "Executing Pipeline..." : "Execute Multi-Agent Reconciliation"}</span>
              </button>
            ) : (
              <button
                onClick={resetAudit}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Simulation</span>
              </button>
            )}
          </div>
        </div>

        {/* 3D Multi-Agent Visualizer Canvas */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Interactive 3D Multi-Agent Topology & Real-Time Data Flow</span>
            </span>
            <span className="text-[11px] text-slate-500">
              LangGraph State: <strong className="text-cyan-300 uppercase">{currentStep}</strong>
            </span>
          </div>

          <ThreeAgentMesh
            currentStep={currentStep}
            selectedAgent={selectedAgent}
            onSelectAgent={(agentId) => setSelectedAgent(agentId)}
            telemetryLogs={telemetry}
          />
        </section>

        {/* Statutory CA Approval Gateway (Appears when paused at interrupt) */}
        {currentStep === "paused_hitl" && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <CAApprovalGateway
              threadId={threadId || "audit_thread_active"}
              adjustmentPlan={adjustmentPlan}
              discrepanciesCount={discrepancies.length}
              onResume={handleResumeWorkflow}
              isSubmitting={isSubmittingApproval}
            />
          </section>
        )}

        {/* Final Certified Report (Appears after CA approval) */}
        {(currentStep === "completed" || currentStep === "approved") && finalReport && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <AuditReportCertificate
              report={finalReport}
              approval={humanApproval}
              onReset={resetAudit}
            />
          </section>
        )}

        {/* Detailed Audit & Investigation Tabs */}
        <section className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reconciliation Matrix ({discrepancies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("dossier")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeTab === "dossier"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Legal RAG Dossier ({legalEvaluations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("presidio")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeTab === "presidio"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Presidio PII Redaction</span>
            </button>

            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeTab === "telemetry"
                  ? "bg-slate-800 text-slate-200 border border-slate-700 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Agent Telemetry ({telemetry.length})</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div>
            {activeTab === "matrix" && (
              <ReconciliationMatrix discrepancies={discrepancies} />
            )}
            {activeTab === "dossier" && (
              <LegalReasoningDossier evaluations={legalEvaluations} />
            )}
            {activeTab === "presidio" && (
              <PresidioInspector
                auditData={anonymizationAudit}
                sampleInvoices={anonymizedPayload?.sap_purchase_register || sampleData?.sap_purchase_register || []}
              />
            )}
            {activeTab === "telemetry" && (
              <TelemetryStream telemetryLogs={telemetry} />
            )}
          </div>
        </section>
      </main>

      {/* Groq API Key Configuration Modal */}
      {groqKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-slate-700 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Configure Groq API Key
                </h3>
              </div>
              <button
                onClick={() => { setGroqKeyModalOpen(false); setKeyFeedback(null); }}
                className="text-slate-500 hover:text-slate-300 font-mono text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Active key badge */}
            {health?.llm_engine?.has_key && health?.llm_engine?.masked_key && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active: <span className="text-emerald-200 font-bold">{health.llm_engine.masked_key}</span></span>
                </div>
                <button
                  onClick={clearGroqKey}
                  disabled={isSavingKey}
                  className="text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50 text-[10px] underline"
                >
                  Clear Key
                </button>
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              ARIA uses the Groq Cloud API for ultra-low latency Llama-3.3 70B inference.
              Get your free key at{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300">console.groq.com/keys</a>.
              Without a key, the built-in autonomous statutory engine handles all reasoning.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-300">
                Groq API Key (starts with <span className="text-amber-300">gsk_</span>)
              </label>
              <input
                type="password"
                value={groqApiKeyInput}
                onChange={(e) => { setGroqApiKeyInput(e.target.value); setKeyFeedback(null); }}
                onKeyDown={(e) => e.key === "Enter" && saveGroqKey()}
                placeholder="gsk_..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-600"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Feedback message */}
            {keyFeedback && (
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-mono ${
                keyFeedback.type === "success"
                  ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/50 border border-rose-500/30 text-rose-300"
              }`}>
                {keyFeedback.type === "success"
                  ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  : <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                }
                <span>{keyFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setGroqKeyModalOpen(false); setKeyFeedback(null); }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveGroqKey}
                disabled={isSavingKey || !groqApiKeyInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                {isSavingKey ? (
                  <><span className="h-3 w-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />Saving...</>
                ) : (
                  <><Key className="w-3 h-3" />Save &amp; Connect</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 px-6 text-center text-[11px] text-slate-500 font-mono">
        ARIA RegTech • Built with Next.js, React Three Fiber, FastAPI, LangGraph, PostgreSQL & Microsoft Presidio
      </footer>
    </div>
  );
}
