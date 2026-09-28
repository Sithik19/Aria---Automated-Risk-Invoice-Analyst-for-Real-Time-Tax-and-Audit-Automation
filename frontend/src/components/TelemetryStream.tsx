"use client";

import React from "react";
import { Terminal, Clock, Cpu, CheckCircle, AlertTriangle } from "lucide-react";

interface TelemetryStreamProps {
  telemetryLogs: any[];
}

export default function TelemetryStream({ telemetryLogs = [] }: TelemetryStreamProps) {
  return (
    <div className="rounded-xl glass-panel p-5 border border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            LangGraph Agent Telemetry Stream
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {telemetryLogs.length} events logged
        </span>
      </div>

      <div className="space-y-2.5 mt-3 max-h-[220px] overflow-y-auto pr-1">
        {telemetryLogs.length > 0 ? (
          telemetryLogs.map((log, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      log.status === "COMPLETED"
                        ? "bg-emerald-400"
                        : log.status === "APPROVED"
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="font-bold text-slate-300 uppercase">{log.node}</span>
                  <span className="text-slate-500 font-sans">{log.agent_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{log.latency_ms}ms</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <p className="text-slate-400 text-[11px] font-sans pl-3.5 border-l border-slate-800">
                {log.message}
              </p>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-mono">
            Awaiting invoice payload ingestion...
          </div>
        )}
      </div>
    </div>
  );
}
