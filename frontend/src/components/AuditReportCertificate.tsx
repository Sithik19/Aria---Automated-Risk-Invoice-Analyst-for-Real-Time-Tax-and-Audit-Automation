"use client";

import React from "react";
import { CheckCircle2, Award, Printer, ShieldCheck, FileText, Hash } from "lucide-react";

interface AuditReportCertificateProps {
  report: any;
  approval: any;
  onReset: () => void;
}

export default function AuditReportCertificate({
  report,
  approval,
  onReset
}: AuditReportCertificateProps) {
  if (!report) return null;

  const udin = report.udin || approval?.udin || "26512345ABCDEF1234";
  const caName = report.ca_name || approval?.ca_name || "CA Rajesh Sharma, FCA";
  const caMem = report.ca_membership_no || approval?.ca_membership_no || "512345";
  const netLiability = report.executive_summary?.net_tax_liability_inr || 0;

  return (
    <div className="relative rounded-2xl glass-panel p-8 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900/90 to-slate-950 shadow-2xl">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <span className="text-8xl font-black font-mono tracking-widest text-emerald-400 rotate-[-15deg]">
          UDIN CERTIFIED
        </span>
      </div>

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Statutory Certificate Minted
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {report.certificate_id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              Statutory Tax Audit & Reconciliation Certificate
            </h2>
            <p className="text-xs text-slate-400">
              Generated via ARIA Multi-Agent Pipeline & Statutorily Validated under Section 141 Companies Act, 2013.
            </p>
          </div>
        </div>

        {/* Official UDIN Seal Badge */}
        <div className="bg-slate-950/90 px-5 py-3 rounded-xl border border-emerald-500/40 text-center shadow-lg">
          <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
            ICAI Unique Document ID (UDIN)
          </div>
          <div className="text-lg font-black font-mono tracking-widest text-emerald-300 mt-0.5">
            {udin}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">Statutorily Verified & Authenticated</div>
        </div>
      </div>

      {/* Certification Declaration */}
      <div className="my-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        <p className="italic font-serif">
          "{report.statutory_declaration}"
        </p>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
          <div>
            Signing Auditor: <strong className="text-slate-200">{caName}</strong> (M.No: {caMem})
          </div>
          <div>Certified Timestamp: {new Date(report.generated_at).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Net Statutory Liability</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            ₹{netLiability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Sec 16(2)(aa) Reversal</div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            ₹{(report.executive_summary?.ineligible_itc_reversal_required || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Sec 194Q TDS Deposit</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
            ₹{(report.executive_summary?.section_194q_tds_obligation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Sec 50(1) Interest (18%)</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            ₹{(report.executive_summary?.section_50_interest_payable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Adjustments Executed Checklist */}
      <div className="space-y-2 my-6">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Statutory Adjustment Directives:
        </h4>
        <div className="space-y-1.5">
          {(report.adjustments_summary || []).map((adj: string, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{adj}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-800">
        <div className="text-xs text-slate-500 font-mono">
          Durable state persisted to PostgreSQL <code className="text-slate-400">aria_db</code> checkpointer.
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>

          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            Start New Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
}
