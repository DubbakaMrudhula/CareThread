"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, CheckCircle, ShieldCheck, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SessionData {
  patientName: string;
  visitNumber: number;
  patientId: string;
  differentials: any[];
  auditLogs: any[];
  flags: any[];
  totalCost: number;
  messages: any[];
  endedAt: string;
}

export default function PostVisitSummary() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [soap, setSoap] = useState<SoapNote | null>(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapError, setSoapError] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("carethread_session");
    if (!raw) return;

    try {
      const data: SessionData = JSON.parse(raw);
      setSession(data);

      // Generate SOAP note from the session
      if (data.patientId && data.messages?.length > 1) {
        setSoapLoading(true);
        fetch("http://localhost:8000/api/session/soap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: data.patientId,
            messages: data.messages,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("SOAP API Error");
            return res.json();
          })
          .then((result) => {
            setSoap(result.soap);
          })
          .catch(() => setSoapError(true))
          .finally(() => setSoapLoading(false));
      }
    } catch {
      console.error("Failed to parse session data from localStorage");
    }
  }, []);

  // Confidence colour helper
  const confColor = (c: number) =>
    c >= 70 ? "text-rose-500" : c >= 50 ? "text-amber-500" : "text-emerald-600";

  const allergyFlag = session?.flags?.find((f) => f.type === "allergy_conflict");

  const handleExportEHR = () => {
    if (!session || !soap) return;
    const content = `CLINICAL SOAP NOTE - CARETHREAD
Patient Name: ${session.patientName} (ID: ${session.patientId})
Visit Number: ${session.visitNumber}
Date: ${session.endedAt ? new Date(session.endedAt).toLocaleDateString() : new Date().toLocaleDateString()}

SUBJECTIVE:
${soap.subjective}

OBJECTIVE:
${soap.objective}

ASSESSMENT:
${soap.assessment}

PLAN:
${soap.plan}

DIFFERENTIAL DIAGNOSES:
${(session.differentials || []).map(d => `- ${d.condition} (${d.confidence}% confidence) - Evidence: ${d.evidence}${d.urgent ? " [URGENT]" : ""}`).join("\n")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SOAP_Note_${session.patientName.replace(/\s+/g, "_")}_Visit_${session.visitNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Session <span className="text-purple-main font-light">Summary</span>
          </h1>
          <p className="text-zinc-500 mt-2">
            {session
              ? `${session.patientName} • Visit #${session.visitNumber} • Completed`
              : "Loading session…"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <ShieldCheck size={16} /> Admin &amp; Compliance
          </Link>
          <Link
            href="/"
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            Return to Dashboard
          </Link>
          <button
            onClick={handleExportEHR}
            disabled={!soap}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              soap
                ? "bg-purple-main text-white hover:bg-purple-dark"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
          >
            <Download size={16} /> Export to EHR
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* ── SOAP Note ─────────────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Stethoscope className="text-purple-main" /> AI-Generated SOAP Note
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium ml-1">
              70B Model
            </span>
          </h2>

          {soapLoading && (
            <div className="flex items-center gap-3 text-zinc-500 py-6">
              <Loader2 size={20} className="animate-spin" />
              Generating clinical documentation…
            </div>
          )}

          {soapError && (
            <p className="text-rose-500 text-sm">
              Could not generate SOAP note — check that the backend is running.
            </p>
          )}

          {soap && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: "subjective", label: "S — Subjective", color: "border-blue-200 bg-blue-50" },
                  { key: "objective", label: "O — Objective", color: "border-emerald-200 bg-emerald-50" },
                  { key: "assessment", label: "A — Assessment", color: "border-amber-200 bg-amber-50" },
                  { key: "plan", label: "P — Plan", color: "border-purple-200 bg-purple-50" },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key} className={`p-4 rounded-xl border ${color}`}>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    {label}
                  </h3>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {soap[key]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!soapLoading && !soap && !soapError && (
            <p className="text-zinc-400 text-sm italic">
              No session data found. Complete a session first.
            </p>
          )}
        </div>

        {/* ── Clinical Documentation ────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <FileText className="text-purple-main" /> Clinical Documentation
          </h2>

          <div className="space-y-6">
            {/* Differentials */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                AI-Generated Differentials
                {session?.differentials?.length ? (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full normal-case font-medium">
                    Live · {session.differentials.length} conditions
                  </span>
                ) : null}
              </h3>

              {session?.differentials && session.differentials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {session.differentials.map((diff, i) => (
                    <div
                      key={i}
                      className={`flex flex-col p-4 rounded-lg border ${
                        diff.urgent
                          ? "bg-rose-50 border-rose-200"
                          : "bg-zinc-50 border-zinc-100"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`font-semibold ${
                            diff.urgent ? "text-rose-900" : "text-foreground"
                          }`}
                        >
                          {diff.condition}
                        </span>
                        <span className={`font-bold ${confColor(diff.confidence)}`}>
                          {diff.confidence}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full mb-2">
                        <div
                          className={`h-full rounded-full ${
                            diff.urgent ? "bg-rose-500" : "bg-purple-400"
                          }`}
                          style={{ width: `${diff.confidence}%` }}
                        />
                      </div>
                      {diff.urgent && (
                        <span className="text-xs text-rose-700 font-medium mb-1">
                          URGENT workup recommended
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        Evidence: {diff.evidence}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm italic">
                  No differentials generated in this session (only appear for high-complexity inputs).
                </p>
              )}
            </div>

            {/* Prevented Mistakes */}
            {allergyFlag && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Prevented Mistakes
                </h3>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle className="text-emerald-500 mt-0.5" size={18} />
                  <div>
                    <p className="font-medium text-emerald-900">Allergy Conflict Blocked</p>
                    <p className="text-sm text-emerald-700 mt-1">{allergyFlag.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Session cost */}
            {session && (
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-zinc-400">Total session AI cost</p>
                <p className="font-mono text-sm font-semibold text-emerald-600">
                  ${session.totalCost.toFixed(5)}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
