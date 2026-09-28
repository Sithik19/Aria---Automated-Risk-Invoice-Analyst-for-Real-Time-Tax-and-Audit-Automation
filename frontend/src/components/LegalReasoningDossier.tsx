"use client";

import React from "react";
import { Scale, BookOpen, ExternalLink, Sparkles, CheckCheck, Landmark } from "lucide-react";

interface LegalReasoningDossierProps {
  evaluations: any[];
}

export default function LegalReasoningDossier({ evaluations = [] }: LegalReasoningDossierProps) {
  return (
    <div className="rounded-xl glass-panel p-5 border border-purple-500/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Reasoning Agent Statutory Precedence Dossier
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Qdrant Hybrid RAG
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cross-domain legal calculations resolving statutory conflicts (e.g., TDS 194Q overriding TCS 206C(1H)).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-purple-300 bg-purple-950/40 px-3 py-1 rounded-md border border-purple-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CBDT Circular No. 13/2021 Indexed</span>
        </div>
      </div>

      {/* Evaluations List */}
      <div className="space-y-4 mt-4">
        {evaluations.map((ev, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {ev.statutory_clause}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {ev.precedence_rule}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <BookOpen className="w-3 h-3 text-cyan-400" />
                <span>{ev.rag_citation}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans mt-3 leading-relaxed">
              {ev.rationale}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[10px] uppercase font-mono text-slate-500">Statutory Action:</span>
                <span className="text-amber-300 font-medium text-[11px]">{ev.action_required}</span>
              </div>

              <div className="font-mono text-right">
                <span className="text-[10px] uppercase text-slate-500 mr-2">Assessed Impact:</span>
                <span className="font-bold text-purple-300">
                  ₹{Math.abs(ev.financial_impact_inr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
