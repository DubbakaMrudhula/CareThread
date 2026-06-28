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

        {/* ── Submit Visit to EHR ────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <CheckCircle className="text-purple-main" /> Finalize Medical Visit
          </h2>

          <VisitSubmitForm session={session} soap={soap} />
        </div>
      </motion.div>
    </div>
  );
}

function VisitSubmitForm({ session, soap }: { session: SessionData | null; soap: SoapNote | null }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [visitType, setVisitType] = useState("consultation");
  
  // Vitals State
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [glucose, setGlucose] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Prefill when soap note loads
  useEffect(() => {
    if (soap) {
      setDiagnosis(soap.assessment ? soap.assessment.split("\n")[0].replace(/Assessment:\s*/i, "").trim() : "");
      setPrescription(soap.plan ? soap.plan.trim() : "");
      setNotes(`Subjective:\n${soap.subjective}\n\nObjective:\n${soap.objective}`);
    }
  }, [soap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setError("");
    setLoading(true);

    const token = localStorage.getItem("carethread_token");

    const vitalSigns: any = {};
    if (systolic) vitalSigns.systolic = parseFloat(systolic);
    if (diastolic) vitalSigns.diastolic = parseFloat(diastolic);
    if (heartRate) vitalSigns.heartRate = parseFloat(heartRate);
    if (weight) vitalSigns.weight = parseFloat(weight);
    if (glucose) vitalSigns.glucose = parseFloat(glucose);
    if (temperature) vitalSigns.temperature = parseFloat(temperature);
    if (spo2) vitalSigns.spo2 = parseFloat(spo2);

    try {
      const res = await fetch("http://localhost:8000/api/doctors/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: session.patientId,
          visit_date: new Date().toISOString().split("T")[0],
          visit_type: visitType,
          diagnosis: diagnosis || "General Consultation",
          prescription,
          notes,
          vital_signs: Object.keys(vitalSigns).length > 0 ? vitalSigns : null,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit visit record.");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center">
        <h3 className="text-lg font-bold">Visit Logged Successfully</h3>
        <p className="text-sm mt-1">The clinical record and structured vitals have been successfully synced to the secure patient ledger.</p>
        <Link href="/" className="mt-4 inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
          Go Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Clinical Text */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 block mb-1">Visit Type</label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              className="w-full bg-zinc-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
            >
              <option value="consultation">Consultation</option>
              <option value="check-up">Check-up</option>
              <option value="follow-up">Follow-up</option>
              <option value="surgery">Surgery</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 block mb-1">Primary Diagnosis</label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Stage 1 Hypertension"
              className="w-full bg-zinc-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 block mb-1">Treatment Plan / Prescription</label>
            <textarea
              rows={3}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g. Lisinopril 10mg daily. Follow up in 4 weeks."
              className="w-full bg-zinc-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 block mb-1">Visit Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detailed doctor notes..."
              className="w-full bg-zinc-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
            />
          </div>
        </div>

        {/* Right Side: Structured Vitals (Optional) */}
        <div className="space-y-4 bg-zinc-50/50 p-5 rounded-2xl border border-border">
          <h3 className="text-sm font-bold text-zinc-600 mb-2 uppercase tracking-wider">Structured Vitals (Optional)</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="120"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Diastolic BP (mmHg)</label>
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="80"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="72"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="98"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.8"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1">Blood Glucose (mg/dL)</label>
              <input
                type="number"
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                placeholder="90"
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70"
              className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-purple-main hover:bg-purple-dark text-white font-bold rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : null}
        Commit Record to Patient EHR & Secure Ledger
      </button>
    </form>
  );
}
