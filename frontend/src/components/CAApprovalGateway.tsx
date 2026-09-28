"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, FileCheck, Lock, AlertTriangle, KeyRound } from "lucide-react";

interface CAApprovalGatewayProps {
  threadId: string;
  adjustmentPlan: any;
  discrepanciesCount: number;
  onResume: (data: {
    threadId: string;
    action: "APPROVE" | "REJECT";
    udin: string;
    caMembershipNo: string;
    caName: string;
    comments: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function CAApprovalGateway({
  threadId,
  adjustmentPlan,
  discrepanciesCount,
  onResume,
  isSubmitting
}: CAApprovalGatewayProps) {
  // Pre-fill realistic ICAI credentials for rapid CA demonstration
  const [udin, setUdin] = useState("26512345ABCDEF1234");
  const [caMembershipNo, setCaMembershipNo] = useState("512345");
  const [caName, setCaName] = useState("CA Rajesh Sharma, FCA");
  const [comments, setComments] = useState("Reconciliation matrix and CBDT Circular 13/2021 precedence verified under Section 141.");
  const [confirmedIndependence, setConfirmedIndependence] = useState(true);

  // Validate 18-digit UDIN
  const udinCleaned = udin.trim().toUpperCase();
  const udinRegex = /^[0-9]{2}[0-9]{6}[A-Z0-9]{10}$/;
  const isValidUdin = udinRegex.test(udinCleaned);

  const handleSubmit = async (action: "APPROVE" | "REJECT") => {
    if (action === "APPROVE" && (!isValidUdin || !confirmedIndependence)) {
      return;
    }
    await onResume({
      threadId,
      action,
      udin: udinCleaned,
      caMembershipNo,
      caName,
      comments
    });
  };

  const netLiability = adjustmentPlan?.net_tax_liability_inr || 0;

  return (
    <div className="relative rounded-xl overflow-hidden border border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 p-6 shadow-2xl amber-glow">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Statutory HITL Gateway Paused
              </span>
              <span className="text-xs text-slate-400 font-mono">Thread: {threadId}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              Chartered Accountant Section 141 Sign-Off Required
            </h2>
            <p className="text-xs text-slate-400">
              In compliance with Section 141 of the Companies Act 2013 and ICAI Mandate, the AI cannot finalize tax liabilities autonomously.
            </p>
          </div>
        </div>

        <div className="text-right bg-slate-900/80 px-4 py-2 rounded-lg border border-amber-500/30">
          <div className="text-[10px] uppercase font-mono text-slate-400">Assessed Net Statutory Adjustment</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            ₹{netLiability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Adjustments Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Sec 16(2)(aa) ITC Reversal</div>
          <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
            ₹{(adjustmentPlan?.ineligible_itc_to_reverse || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Missing in GSTR-2B portal filings</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Sec 194Q TDS Deposit</div>
          <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
            ₹{(adjustmentPlan?.section_194q_tds_payable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Overrides Sec 206C(1H) TCS (CBDT 13/2021)</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Sec 50(1) Interest Liability</div>
          <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
            ₹{(adjustmentPlan?.section_50_interest_liability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">18% p.a. on wrongful ITC utilization</div>
        </div>
      </div>

      {/* CA Verification Form */}
      <div className="bg-slate-950/70 rounded-xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>ICAI Statutory Auditor Credentials & UDIN Generation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 18-digit UDIN input */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <span>18-Digit UDIN *</span>
              <span className={`text-[10px] font-bold ${isValidUdin ? "text-emerald-400" : "text-rose-400"}`}>
                {isValidUdin ? "✓ Valid Format" : "Requires 18 alphanumeric chars"}
              </span>
            </label>
            <input
              type="text"
              maxLength={18}
              value={udin}
              onChange={(e) => setUdin(e.target.value.toUpperCase())}
              placeholder="e.g. 26512345ABCDEF1234"
              className={`w-full px-3 py-2 rounded-lg bg-slate-900 border text-sm font-mono tracking-widest uppercase transition-colors ${
                isValidUdin ? "border-emerald-500/60 text-emerald-300" : "border-amber-500/60 text-slate-200"
              } focus:outline-none focus:ring-1 focus:ring-amber-400`}
            />
            <div className="text-[9px] text-slate-500">
              Format: YY (Year: 2 digits) + Membership (6 digits) + Code (10 chars)
            </div>
          </div>

          {/* Membership No */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300">ICAI Membership No. *</label>
            <input
              type="text"
              value={caMembershipNo}
              onChange={(e) => setCaMembershipNo(e.target.value)}
              placeholder="e.g. 512345"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* CA Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300">Auditor Full Name *</label>
            <input
              type="text"
              value={caName}
              onChange={(e) => setCaName(e.target.value)}
              placeholder="e.g. CA Rajesh Sharma, FCA"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Auditor Comments */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-slate-300">Statutory Auditor Audit Notes & Observations</label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Independence Declaration */}
        <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmedIndependence}
            onChange={(e) => setConfirmedIndependence(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-xs text-slate-400 leading-snug">
            I hereby certify independence under Section 141 of the Companies Act, 2013. I have independently verified the 
            quantitative tax mismatch register ({discrepanciesCount} items) and CBDT Circular 13/2021 precedence before signing.
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-5">
        <button
          onClick={() => handleSubmit("REJECT")}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs font-semibold hover:bg-rose-900/50 transition-colors flex items-center justify-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          <span>Reject & Request Re-filing</span>
        </button>

        <button
          onClick={() => handleSubmit("APPROVE")}
          disabled={!isValidUdin || !confirmedIndependence || isSubmitting}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
            isValidUdin && confirmedIndependence && !isSubmitting
              ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 hover:brightness-110 cursor-pointer shadow-amber-500/20"
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{isSubmitting ? "Serializing to PostgreSQL..." : "Validate UDIN & Certify Audit"}</span>
        </button>
      </div>
    </div>
  );
}
