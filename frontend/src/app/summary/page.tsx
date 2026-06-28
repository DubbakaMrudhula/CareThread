"use client";

import { motion } from "framer-motion";
import { FileText, Download, CheckCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function PostVisitSummary() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Session <span className="text-purple-main font-light">Summary</span>
          </h1>
          <p className="text-zinc-500 mt-2">Priya Mehta • Visit #4 • Completed</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2">
            <ShieldCheck size={16} /> Admin & Compliance
          </Link>
          <Link href="/" className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
            Return to Dashboard
          </Link>
          <button className="flex items-center gap-2 bg-purple-main text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-dark transition-colors">
            <Download size={16} /> Export to EHR
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <FileText className="text-purple-main" /> Clinical Documentation
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Chief Complaint & HPI</h3>
              <p className="text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                Patient presents with escalating fatigue present over the last 3 visits, now accompanied by new-onset mild chest tightness. Reports no relief from rest.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI-Generated Differentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">Iron Deficiency Anemia</span>
                    <span className="text-rose-500 font-bold">74%</span>
                  </div>
                  <span className="text-xs text-zinc-500">Evidence: Fatigue escalating x4 visits</span>
                </div>
                <div className="flex flex-col p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">Hypothyroidism</span>
                    <span className="text-amber-500 font-bold">61%</span>
                  </div>
                  <span className="text-xs text-zinc-500">Evidence: Chronic fatigue</span>
                </div>
                <div className="flex flex-col p-4 bg-rose-50 rounded-lg border border-rose-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-rose-900">Early Cardiac Involvement</span>
                    <span className="text-rose-600 font-bold">28%</span>
                  </div>
                  <span className="text-xs text-rose-700">URGENT workup recommended</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Prevented Mistakes</h3>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle className="text-emerald-500 mt-0.5" size={18} />
                <div>
                  <p className="font-medium text-emerald-900">Ibuprofen Prescription Blocked</p>
                  <p className="text-sm text-emerald-700 mt-1">Agent successfully identified allergy from Visit 1 (Jan 12) before e-prescribing was completed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

