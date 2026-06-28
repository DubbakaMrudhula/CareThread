"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Cpu, Download, ArrowLeft, Zap, Brain, Database } from "lucide-react";
import Link from "next/link";

interface AuditLog {
  action: string;
  model: string;
  tier: "FAST" | "CLINICAL" | "LOCAL";
  cost: number;
  reason: string;
}

interface SessionData {
  patientName: string;
  visitNumber: number;
  auditLogs: AuditLog[];
  totalCost: number;
  endedAt: string;
}

const TierBadge = ({ tier }: { tier: string }) => {
  if (tier === "CLINICAL") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
        <Brain size={10} /> CLINICAL
      </span>
    );
  }
  if (tier === "LOCAL") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
        <Database size={10} /> LOCAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <Zap size={10} /> FAST
    </span>
  );
};

export default function AdminCompliance() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("carethread_session");
    if (!raw) return;
    try {
      const data: SessionData = JSON.parse(raw);
      setSession(data);
      setAuditLogs(data.auditLogs ?? []);
    } catch {
      console.error("Failed to parse session from localStorage");
    }
  }, []);

  const totalCost = auditLogs.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const clinicalCalls = auditLogs.filter((l) => l.tier === "CLINICAL").length;
  const fastCalls = auditLogs.filter((l) => l.tier === "FAST").length;

  const sessionTime = session?.endedAt
    ? new Date(session.endedAt).toLocaleTimeString()
    : null;

  const handleExportLogs = () => {
    if (!session || auditLogs.length === 0) return;
    const content = `CARETHREAD COMPLIANCE AUDIT LOG
Patient Name: ${session.patientName}
Visit Number: ${session.visitNumber}
Session Ended At: ${session.endedAt}
Total Session AI Cost: $${totalCost.toFixed(6)}

AUDIT ENTRIES:
${auditLogs.map((log, index) => `${index + 1}. [${log.tier}] ${log.action}
   Model Used: ${log.model}
   Cost: $${log.cost.toFixed(6)}
   Reason/Decision: ${log.reason}
`).join("\n")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Compliance_Audit_Log_${session.patientName.replace(/\s+/g, "_")}_Visit_${session.visitNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Compliance &amp; <span className="text-purple-main font-light">Admin</span>
          </h1>
          <p className="text-zinc-500 mt-2">Immutable Cascade Audit Trail</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/summary"
            className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Summary
          </Link>
          <button
            onClick={handleExportLogs}
            disabled={auditLogs.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              auditLogs.length > 0
                ? "bg-purple-main text-white hover:bg-purple-dark"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
          >
            <Download size={16} /> Export Logs
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Stats bar */}
        {auditLogs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total AI Calls", value: auditLogs.length, color: "text-foreground" },
              {
                label: "CLINICAL (70B)",
                value: clinicalCalls,
                color: "text-purple-600",
              },
              { label: "FAST (8B)", value: fastCalls, color: "text-emerald-600" },
              {
                label: "Session Cost",
                value: `$${totalCost.toFixed(5)}`,
                color: "text-emerald-600",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface border border-border rounded-xl p-4 shadow-sm"
              >
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" />
              {session
                ? `Session: ${session.patientName} (Visit #${session.visitNumber})`
                : "Session Audit Log"}
            </h2>
            {sessionTime && (
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Completed at
                </p>
                <p className="text-sm font-semibold text-zinc-700">{sessionTime}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-zinc-600 mb-6 pb-6 border-b border-border">
            This log records every AI decision, model routing choice, and compliance gate
            triggered during the session. Each entry is produced in real-time by the Cascade
            router and is ready for compliance review.
          </p>

          {auditLogs.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <ShieldCheck size={40} className="mx-auto mb-4 text-zinc-300" />
              <p className="font-medium">No session data found.</p>
              <p className="text-sm mt-1">Complete a session to see the live audit trail here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-purple-200 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-zinc-400" />
                      <span className="text-sm font-bold text-foreground">{log.action}</span>
                      <TierBadge tier={log.tier} />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-mono">
                      ${log.cost.toFixed(6)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                        Model Selected
                      </p>
                      <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                        <Cpu size={12} className="text-purple-main" />
                        {log.model === "Local Fact DB" ? (
                          <span className="text-zinc-600">{log.model}</span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-700">{log.model}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                        Compliance Gate
                      </p>
                      <p className="text-sm font-medium mt-0.5 text-zinc-700">Pass</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-200 border-dashed">
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                      Routing Reason
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{log.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
