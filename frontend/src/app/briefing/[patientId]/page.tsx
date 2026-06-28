"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Activity, User, Calendar, ArrowRight, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config";

export default function PreVisitBriefing() {
  const { patientId } = useParams();
  const router = useRouter();
  
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    
    fetch(`${API_BASE_URL}/api/patient/${patientId}/briefing`)
      .then(res => {
        if (!res.ok) throw new Error("Patient not found");
        return res.json();
      })
      .then(data => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        router.push("/");
      });
  }, [patientId, router]);

  if (loading || !briefing) {
    return (
      <div className="flex justify-center items-center h-screen text-zinc-500">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading patient intelligence...
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-purple-main mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Roster
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            CareThread <span className="text-purple-main font-light">Intelligence</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-sm md:text-base">
            Longitudinal Patient Memory & Risk Stratification
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-zinc-600">Hindsight Active</span>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Patient Info Card */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-sm p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-main">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{briefing.patient_name}</h2>
                  <p className="text-zinc-500 flex items-center gap-2 mt-1">
                    <Calendar size={16} /> DOB: {briefing.dob} | Visit #{briefing.visit_number}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-500">Last seen</p>
                <p className="font-semibold text-foreground">{briefing.last_seen}</p>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              {briefing.open_flags.length === 0 ? (
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                  No active critical flags detected in patient history.
                </div>
              ) : (
                briefing.open_flags.map((flag: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border flex items-start gap-4 ${
                    flag.severity === 'critical' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'
                  }`}>
                    {flag.severity === 'critical' ? (
                      <ShieldAlert className="text-amber-500 mt-0.5 shrink-0" size={20} />
                    ) : (
                      <AlertTriangle className="text-rose-500 mt-0.5 shrink-0" size={20} />
                    )}
                    <div>
                      <h4 className={`font-semibold ${flag.severity === 'critical' ? 'text-amber-900' : 'text-rose-900'}`}>
                        {flag.type.replace('_', ' ').toUpperCase()}: {flag.title}
                      </h4>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 space-y-3">
              <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Relevant History Context</h4>
              {briefing.history.slice(0, 2).map((visit: any, i: number) => (
                <div key={i} className="text-sm bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className="font-medium text-purple-700 block mb-1">Visit {visit.visit_number} • {visit.date}</span>
                  <span className="text-zinc-600">{visit.notes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Score Card */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <TrendingUp className="text-rose-500" size={24} />
          </div>
          
          <h3 className="text-lg font-medium text-zinc-600 mb-6 w-full text-left">Longitudinal Risk</h3>
          
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="10"
              />
              <motion.circle
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * briefing.risk_score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={briefing.risk_score > 50 ? "var(--color-gold-main)" : "#10b981"}
                strokeWidth="10"
                strokeDasharray="283"
                className="drop-shadow-md"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-bold text-foreground">{briefing.risk_score}</span>
              <span className={`text-sm font-semibold mt-1 uppercase tracking-widest ${briefing.risk_score > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {briefing.risk_score > 50 ? 'High' : 'Low'}
              </span>
            </div>
          </div>

          <Link href={`/session/${patientId}`} className="w-full mt-8 group relative inline-flex items-center justify-center px-8 py-4 text-white transition-all duration-200 bg-purple-main rounded-xl hover:bg-purple-dark hover:shadow-lg hover:-translate-y-0.5 overflow-hidden">
            <div className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
            <span className="relative flex items-center font-semibold text-lg tracking-wide">
              Begin Session
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
