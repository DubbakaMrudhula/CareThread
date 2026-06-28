"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Clock, Cpu, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminCompliance() {
  const auditLogs = [
    { time: "10:14:02", action: "Intake Agent Query", model: "Groq Llama 3", cost: "$0.001", reason: "Basic intent classification", compliance: "Pass" },
    { time: "10:14:05", action: "Memory Recall", model: "Vectorize Hindsight", cost: "$0.000", reason: "Retrieving history for 'chest tightness'", compliance: "Pass" },
    { time: "10:14:08", action: "Pattern Detection", model: "Claude Sonnet", cost: "$0.004", reason: "High complexity cross-visit pattern analysis", compliance: "Pass" },
    { time: "10:15:12", action: "Differential Generation", model: "Claude Sonnet", cost: "$0.004", reason: "High complexity clinical reasoning", compliance: "Pass" },
    { time: "10:16:45", action: "Drug Conflict Check", model: "Groq Llama 3", cost: "$0.001", reason: "Structured fact retrieval (Ibuprofen)", compliance: "Flagged - PII gated" },
  ];

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Compliance & <span className="text-purple-main font-light">Admin</span>
          </h1>
          <p className="text-zinc-500 mt-2">Immutable cascadeflow Audit Trail</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/summary" className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Summary
          </Link>
          <button className="flex items-center gap-2 bg-purple-main text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-dark transition-colors">
            <Download size={16} /> Export Logs
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" /> Session: Priya Mehta (Visit #4)
            </h2>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Session Cost</p>
              <p className="text-xl font-bold text-emerald-600">$0.010</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 mb-6 pb-6 border-b border-border">
            This log records every AI decision, model routing choice, and compliance gate triggered during the session. It is immutable and ready for compliance review.
          </p>
          
          <div className="space-y-4">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-purple-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-500">{log.time}</span>
                    <span className="text-sm font-bold text-foreground ml-2">{log.action}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{log.cost}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold">Model Selected</p>
                    <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                      <Cpu size={12} className="text-purple-main" /> {log.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold">Compliance Gate</p>
                    <p className={`text-sm font-medium mt-0.5 ${log.compliance.includes('Flagged') ? 'text-amber-600' : 'text-zinc-700'}`}>
                      {log.compliance}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-200 border-dashed">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Routing Reason</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{log.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
