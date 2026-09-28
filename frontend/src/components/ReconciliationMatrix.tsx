"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle, ArrowRightLeft, FileSpreadsheet, AlertTriangle } from "lucide-react";

interface ReconciliationMatrixProps {
  discrepancies: any[];
}

export default function ReconciliationMatrix({ discrepancies = [] }: ReconciliationMatrixProps) {
  const [filter, setFilter] = useState<"ALL" | "MISMATCHES" | "MISSING">("ALL");

  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (filter === "MISMATCHES") return d.discrepancy_type === "TAXABLE_VALUE_MISMATCH" || d.discrepancy_type === "TAX_AMOUNT_MISMATCH";
    if (filter === "MISSING") return d.discrepancy_type === "MISSING_IN_GSTR2B";
    return true;
  });

  return (
    <div className="rounded-xl glass-panel p-5 border border-emerald-500/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Worker Agent Reconciliation Matrix
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                SAP ERP vs GSTR-2B Portal
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              High-speed quantitative comparison identifying value drifts, tax rate variance, and missing return filings.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          {(["ALL", "MISMATCHES", "MISSING"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                filter === mode
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 mt-4">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Invoice Ref</th>
              <th className="py-2.5 px-3">Discrepancy Class</th>
              <th className="py-2.5 px-3">SAP Books Tax</th>
              <th className="py-2.5 px-3">GSTR-2B Portal Tax</th>
              <th className="py-2.5 px-3">Variance / Delta</th>
              <th className="py-2.5 px-3">Statutory ITC Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredDiscrepancies.length > 0 ? (
              filteredDiscrepancies.map((d, idx) => {
                const sapTax = d.sap_record
                  ? (d.sap_record.igst || 0) + (d.sap_record.cgst || 0) + (d.sap_record.sgst || 0)
                  : 0;
                const portalTax = d.portal_record
                  ? (d.portal_record.igst || 0) + (d.portal_record.cgst || 0) + (d.portal_record.sgst || 0)
                  : 0;

                const isMissing = d.discrepancy_type === "MISSING_IN_GSTR2B";
                const isUnbooked = d.discrepancy_type === "UNBOOKED_INVOICE_IN_2B";

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      <div>{d.invoice_number}</div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                        {d.sap_record?.vendor_name || d.sap_record?.vendor_alias || "Taxable Supplier"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isMissing
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : isUnbooked
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {isMissing ? <AlertTriangle className="w-3 h-3 text-rose-400" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{d.discrepancy_type.replace(/_/g, " ")}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {d.sap_record ? `₹${sapTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {d.portal_record ? `₹${portalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "NOT FILED"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          d.delta_tax_amount > 0 ? "text-rose-400" : d.delta_tax_amount < 0 ? "text-cyan-400" : "text-slate-400"
                        }`}
                      >
                        {d.delta_tax_amount > 0 ? "+" : ""}
                        ₹{d.delta_tax_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="text-[11px] font-semibold text-slate-300">
                        {d.itc_impact === "INELIGIBLE_ITC"
                          ? "Ineligible ITC (Sec 16(2)(aa))"
                          : d.itc_impact === "EXCESS_CLAIM"
                          ? "Excess Claim (Reverse in 3B)"
                          : "Unbooked Eligible Credit"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{d.statutory_note}</div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                  No discrepancies detected under current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
