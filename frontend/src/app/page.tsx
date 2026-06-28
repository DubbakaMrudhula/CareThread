"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Calendar, ArrowRight, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  dob: string;
  risk_score: number;
}

export default function PatientRoster() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/patients")
      .then(res => res.json())
      .then(data => {
        setPatients(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch patients:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            CareThread <span className="text-purple-main font-light">Intelligence</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-sm md:text-base">
            Patient Roster & Risk Stratification
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-zinc-500">
          <Loader2 className="animate-spin mr-2" size={24} /> Loading roster...
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {patients.map(patient => (
            <div key={patient.id} className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex flex-col justify-between hover:border-purple-200 hover:shadow-md transition-all group">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-main">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
                    <p className="text-zinc-500 text-xs flex items-center gap-1 mt-1">
                      <Calendar size={12} /> {patient.dob}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl mb-4">
                  <span className="text-sm text-zinc-500 font-medium">Risk Score</span>
                  <div className={`font-bold flex items-center gap-1 ${patient.risk_score > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <Activity size={14} /> {patient.risk_score}
                  </div>
                </div>
              </div>

              <Link href={`/briefing/${patient.id}`} className="w-full inline-flex items-center justify-center px-4 py-3 bg-white border border-border text-foreground font-medium rounded-xl group-hover:bg-purple-main group-hover:text-white group-hover:border-purple-main transition-colors">
                View Briefing <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
