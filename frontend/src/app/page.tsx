"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Calendar,
  ArrowRight,
  Activity,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  LogOut,
  Plus,
  Stethoscope,
  HeartPulse,
  AlertCircle,
  FileText,
  Hospital,
  Phone,
  ShieldAlert,
  ChevronDown
} from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  dob: string;
  risk_score: number;
  allergies?: string;
}

interface Visit {
  id: string;
  patient_id: string;
  visit_date: string;
  visit_type: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  vital_signs?: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    weight?: number;
  };
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientVisits, setPatientVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth form states
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState("doctor");
  const [authLicense, setAuthLicense] = useState("");
  const [authDob, setAuthDob] = useState("");
  const [authGender, setAuthGender] = useState("M");
  const [authError, setAuthError] = useState("");

  // Add patient form states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientDob, setNewPatientDob] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("M");
  const [newPatientBlood, setNewPatientBlood] = useState("O+");
  const [newPatientAllergies, setNewPatientAllergies] = useState("");
  const [addPatientError, setAddPatientError] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("carethread_token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = (tokenString: string) => {
    setLoading(true);
    fetch("http://localhost:8000/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenString}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        setUserProfile(data);
        setUserRole(data.role);
        if (data.role === "doctor") {
          fetchDoctorPatients(tokenString);
        } else {
          fetchPatientVisits(tokenString);
        }
      })
      .catch(() => {
        handleLogout();
      });
  };

  const fetchDoctorPatients = (tokenString: string) => {
    fetch("http://localhost:8000/api/doctors/patients", {
      headers: { Authorization: `Bearer ${tokenString}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load patients", err);
        setLoading(false);
      });
  };

  const fetchPatientVisits = (tokenString: string) => {
    fetch("http://localhost:8000/api/patients/visits", {
      headers: { Authorization: `Bearer ${tokenString}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setPatientVisits(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load visits", err);
        setLoading(false);
      });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const url = isLogin
      ? "http://localhost:8000/api/auth/login"
      : "http://localhost:8000/api/auth/register";

    const body = isLogin
      ? { email: authEmail, password: authPassword }
      : {
          email: authEmail,
          password: authPassword,
          role: authRole,
          name: authName,
          license: authLicense,
          dob: authDob,
          gender: authGender
        };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      if (isLogin) {
        localStorage.setItem("carethread_token", data.access_token);
        setToken(data.access_token);
        fetchProfile(data.access_token);
      } else {
        // Switch to login
        setIsLogin(true);
        setAuthPassword("");
        setAuthError("Registration successful! Please login.");
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("carethread_token");
    setToken(null);
    setUserRole(null);
    setUserProfile(null);
    setPatients([]);
    setPatientVisits([]);
    setLoading(false);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddPatientError("");
    try {
      const res = await fetch("http://localhost:8000/api/doctors/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newPatientEmail,
          name: newPatientName,
          dob: newPatientDob,
          gender: newPatientGender,
          blood_type: newPatientBlood,
          allergies: newPatientAllergies
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add patient");

      setShowAddPatient(false);
      setNewPatientEmail("");
      setNewPatientName("");
      setNewPatientDob("");
      setNewPatientAllergies("");
      fetchDoctorPatients(token!);
    } catch (err: any) {
      setAddPatientError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin text-purple-main mb-4" size={32} />
        <span className="text-sm font-semibold tracking-wide">Initializing Safe Workspace...</span>
      </div>
    );
  }

  // Not logged in: Auth portal
  if (!token) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100 via-slate-50 to-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background grid and blurs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none" />

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white/70 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-[0_20px_50px_-12px_rgba(139,92,246,0.15)] overflow-hidden relative z-10">
          
          {/* Brand/Hero Panel (Left) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-purple-900 to-indigo-950 p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/35 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md text-purple-300 border border-white/10 mb-6">
                <Stethoscope size={28} />
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                CareThread <span className="text-purple-300 font-light block text-2xl mt-1">Clinical Workspace</span>
              </h1>
              <p className="text-purple-200/75 text-sm mt-4 leading-relaxed font-medium">
                Longitudinal patient memory, secure medical ledger, and real-time clinical cascade intelligence.
              </p>
            </div>

            <div className="mt-12 lg:mt-0 relative z-10 space-y-4">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <ShieldCheck className="text-emerald-400 shrink-0" size={20} />
                <div className="text-xs">
                  <span className="font-bold text-white block">HIPAA Compliant</span>
                  <span className="text-purple-200/70">AES-256 end-to-end ledger protection</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Activity className="text-purple-300 shrink-0" size={20} />
                <div className="text-xs">
                  <span className="font-bold text-white block">Cascade Triage</span>
                  <span className="text-purple-200/70">8B to 70B clinical model routing</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-purple-300/40 mt-8 relative z-10">
              © {new Date().getFullYear()} CareThread, Inc. Platform v2.1.0
            </div>
          </div>

          {/* Form Panel (Right) */}
          <div className="lg:col-span-7 p-10 lg:p-12 flex flex-col justify-center bg-white/40">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isLogin ? "Welcome back" : "Create secure account"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {isLogin ? "Access your secure medical dashboard" : "Sign up for practitioner or portal access"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" /> {authError}
                </div>
              )}

              {!isLogin && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Dr. Sarah Jenkins"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role Type</label>
                      <select
                        value={authRole}
                        onChange={(e) => setAuthRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                      >
                        <option value="doctor">Medical Practitioner</option>
                        <option value="patient">Patient Portal</option>
                      </select>
                    </div>
                  </div>

                  {authRole === "doctor" ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Medical License ID</label>
                      <input
                        type="text"
                        required
                        value={authLicense}
                        onChange={(e) => setAuthLicense(e.target.value)}
                        placeholder="LIC-123456"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth</label>
                        <input
                          type="date"
                          required
                          value={authDob}
                          onChange={(e) => setAuthDob(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
                        <select
                          value={authGender}
                          onChange={(e) => setAuthGender(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@hospital.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={16} />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-main hover:bg-purple-dark text-white rounded-xl py-3.5 font-bold text-sm transition-all shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] mt-6 cursor-pointer"
              >
                {isLogin ? "Sign In to Workspace" : "Register Credentials"}
              </button>
            </form>

          </div>
        </div>
      </div>
    );
  }

  // Doctor Dashboard View
  if (userRole === "doctor") {
    return (
      <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Practitioner <span className="text-purple-main font-light">Dashboard</span>
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm">
              <Hospital size={16} className="text-purple-main" /> {userProfile?.hospital || "Hospital Portal"} • {userProfile?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddPatient(true)}
              className="flex items-center gap-1.5 bg-purple-main text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-dark shadow-sm transition-all"
            >
              <Plus size={16} /> Add Patient
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {patients.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-500">
            <User className="mx-auto text-slate-300 mb-4" size={40} />
            <h3 className="font-semibold text-slate-800 text-lg">No assigned patients</h3>
            <p className="text-xs text-slate-400 mt-1">Use the Add Patient button to create record profiles.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-purple-200 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-main font-bold">
                      {patient.name[0]}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800 group-hover:text-purple-main transition-colors">
                        {patient.name}
                      </h2>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> DOB: {patient.dob}
                      </p>
                    </div>
                  </div>

                  {patient.allergies && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg mb-4 flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span className="truncate">Allergy: {patient.allergies}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Longitudinal Risk</span>
                    <span
                      className={`text-sm font-bold flex items-center gap-1 ${
                        patient.risk_score > 50 ? "text-rose-500" : "text-emerald-500"
                      }`}
                    >
                      <Activity size={14} /> {patient.risk_score}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/briefing/${patient.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-slate-50 border border-slate-100 text-slate-700 font-semibold text-sm rounded-xl group-hover:bg-purple-main group-hover:text-white transition-all"
                >
                  View Patient Info <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </motion.div>
        )}

        {/* Add Patient Modal */}
        <AnimatePresence>
          {showAddPatient && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl relative"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-6">Create New Patient Profile</h3>
                <form onSubmit={handleAddPatient} className="space-y-4">
                  {addPatientError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
                      {addPatientError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email (For Portal Account)</label>
                    <input
                      type="email"
                      required
                      value={newPatientEmail}
                      onChange={(e) => setNewPatientEmail(e.target.value)}
                      placeholder="jane@patient.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={newPatientDob}
                        onChange={(e) => setNewPatientDob(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Gender</label>
                      <select
                        value={newPatientGender}
                        onChange={(e) => setNewPatientGender(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Blood Type</label>
                      <select
                        value={newPatientBlood}
                        onChange={(e) => setNewPatientBlood(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="AB+">AB+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Allergies (If any)</label>
                      <input
                        type="text"
                        value={newPatientAllergies}
                        onChange={(e) => setNewPatientAllergies(e.target.value)}
                        placeholder="e.g. Ibuprofen, Penicillin"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddPatient(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-purple-main hover:bg-purple-dark text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                    >
                      Add Patient
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Patient Dashboard Portal (Timeline)
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-12">
      <header className="mb-12 flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-purple-main uppercase bg-purple-50 px-2.5 py-1 rounded-full">
            Patient Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            Welcome, <span className="text-purple-main font-light">{userProfile?.name}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            DOB: {userProfile?.dob} | Blood Type: {userProfile?.blood_type || "Unknown"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
        >
          <LogOut size={16} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-main">
            <HeartPulse size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Longitudinal Risk</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{userProfile?.risk_score}</p>
          </div>
        </div>

        {userProfile?.allergies && (
          <div className="bg-rose-50/50 rounded-2xl border border-rose-100 p-6 flex items-center gap-4 md:col-span-2">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase">Critical Allergies Detected</p>
              <p className="text-sm font-semibold text-rose-900 mt-1">
                {userProfile.allergies} — Avoid administration of NSAIDs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Patient Health Trends Dashboard ────────────────────────────── */}
      <PatientHealthTrends visits={patientVisits} />

      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 mt-12">
        <FileText className="text-purple-main" size={20} /> Medical Visit Timeline
      </h2>

      {patientVisits.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 bg-white">
          <Calendar className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="font-semibold text-slate-800 text-base">No visit records yet</h3>
          <p className="text-xs text-slate-400 mt-1">Visit logs will appear once Dr. Carter uploads summaries.</p>
        </div>
      ) : (
        <div className="relative border-l border-slate-200 pl-6 ml-4 space-y-8">
          {patientVisits.map((visit) => (
            <motion.div
              key={visit.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative bg-white border border-slate-200 p-6 rounded-2xl shadow-sm"
            >
              <div className="absolute -left-[33px] top-6 w-4 h-4 rounded-full bg-purple-main border-4 border-white shadow-sm" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    {visit.visit_type.toUpperCase()}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mt-1.5">{visit.diagnosis}</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">{visit.visit_date}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                <strong>Clinician Notes:</strong> {visit.notes}
              </p>
              {visit.prescription && (
                <div className="text-xs text-slate-500">
                  <strong>Prescribed Treatment:</strong> <span className="text-purple-main font-medium">{visit.prescription}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const REFERENCE_RANGES: any = {
  systolic: { max: 120, label: "Max 120 mmHg" },
  diastolic: { max: 80, label: "Max 80 mmHg" },
  heartRate: { min: 60, max: 100, label: "60-100 bpm" },
  glucose: { min: 70, max: 99, label: "70-99 mg/dL" },
  spo2: { min: 95, max: 100, label: "95-100%" },
  temperature: { min: 36.1, max: 37.2, label: "36.1-37.2°C" }
};

interface TrendsMetrics {
  title: string;
  key: string;
  unit: string;
  color: string;
}

function PatientHealthTrends({ visits }: { visits: any[] }) {
  if (!visits || visits.length === 0) return null;

  // Chronological order for plotting
  const chronoVisits = [...visits].reverse();

  const metrics: TrendsMetrics[] = [
    { title: "Systolic Blood Pressure", key: "systolic", unit: "mmHg", color: "#8b5cf6" },
    { title: "Diastolic Blood Pressure", key: "diastolic", unit: "mmHg", color: "#a78bfa" },
    { title: "Heart Rate", key: "heartRate", unit: "bpm", color: "#ef4444" },
    { title: "Oxygen Saturation (SpO2)", key: "spo2", unit: "%", color: "#06b6d4" },
    { title: "Blood Glucose", key: "glucose", unit: "mg/dL", color: "#f59e0b" },
    { title: "Body Temperature", key: "temperature", unit: "°C", color: "#10b981" }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="text-purple-main" size={22} /> Patient Health Trends
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Historical changes in vital signs recorded during consultations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => {
          // Extract readings
          const readings = chronoVisits
            .map((v) => ({
              date: v.visit_date,
              value: v.vital_signs ? v.vital_signs[metric.key] : null
            }))
            .filter((r) => r.value !== null && r.value !== undefined) as { date: string; value: number }[];

          if (readings.length === 0) return null;

          const values = readings.map((r) => r.value);
          const minVal = Math.min(...values);
          const maxVal = Math.max(...values);
          const range = REFERENCE_RANGES[metric.key];
          
          // Compute status observations
          let statusText = "Within standard reference range";
          let statusColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
          const lastReading = values[values.length - 1];

          if (range) {
            if (range.max !== undefined && lastReading > range.max) {
              statusText = "Above standard reference range";
              statusColor = "text-amber-600 bg-amber-50 border-amber-100";
            } else if (range.min !== undefined && lastReading < range.min) {
              statusText = "Below standard reference range";
              statusColor = "text-amber-600 bg-amber-50 border-amber-100";
            } else if (range.min !== undefined && range.max !== undefined && (lastReading < range.min || lastReading > range.max)) {
              statusText = "Outside standard reference range";
              statusColor = "text-amber-600 bg-amber-50 border-amber-100";
            }
          }

          // SVG plot calculation
          const width = 300;
          const height = 120;
          const padding = 20;

          // Standardize plotting coordinates
          const plotMin = Math.min(minVal, range?.min !== undefined ? range.min : minVal) - 5;
          const plotMax = Math.max(maxVal, range?.max !== undefined ? range.max : maxVal) + 5;
          const plotDiff = (plotMax - plotMin) || 1;

          const points = readings.map((r, i) => {
            const x = padding + (i / Math.max(readings.length - 1, 1)) * (width - padding * 2);
            const y = height - padding - ((r.value - plotMin) / plotDiff) * (height - padding * 2);
            return `${x},${y}`;
          });

          // Overlay standard reference band coordinates
          let refBandY1 = 0;
          let refBandY2 = 0;
          let showBand = false;

          if (range) {
            showBand = true;
            const minB = range.min !== undefined ? range.min : plotMin;
            const maxB = range.max !== undefined ? range.max : plotMax;

            refBandY1 = height - padding - ((maxB - plotMin) / plotDiff) * (height - padding * 2);
            refBandY2 = height - padding - ((minB - plotMin) / plotDiff) * (height - padding * 2);
          }

          return (
            <div key={metric.key} className="border border-slate-100 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{metric.title}</h4>
                    <p className="text-xs text-slate-400 font-medium">Ref Range: {range?.label || "General"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {statusText}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 mt-3">
                  <span className="text-2xl font-black text-slate-800">{lastReading}</span>
                  <span className="text-xs font-semibold text-slate-500">{metric.unit}</span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="mt-4 bg-white rounded-xl border border-slate-200/60 p-2">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                  {/* Reference Band */}
                  {showBand && (
                    <rect
                      x={padding}
                      y={Math.min(refBandY1, refBandY2)}
                      width={width - padding * 2}
                      height={Math.max(Math.abs(refBandY2 - refBandY1), 1)}
                      fill={`${metric.color}15`}
                      rx="3"
                    />
                  )}
                  
                  {/* Grid Lines */}
                  <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />

                  {/* Trend Line */}
                  {readings.length > 1 && (
                    <polyline
                      fill="none"
                      stroke={metric.color}
                      strokeWidth="2.5"
                      points={points.join(" ")}
                    />
                  )}

                  {/* Dots & Labels */}
                  {readings.map((r, i) => {
                    const coords = points[i].split(",");
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    return (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill={metric.color}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x={x}
                          y={y - 8}
                          textAnchor="middle"
                          fill={metric.color}
                          className="text-[9px] font-bold"
                        >
                          {r.value}
                        </text>
                        <text
                          x={x}
                          y={height - 5}
                          textAnchor="middle"
                          fill="#94a3b8"
                          className="text-[8px] font-semibold"
                        >
                          {r.date.split("-").slice(1).join("/")}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
        <span className="text-base">ℹ️</span>
        <p className="leading-normal">
          <strong>Standard reference guidelines note:</strong> Your doctor may set a different target for your specific clinical status. These reference ranges represent general adult targets. This is a read-only historical record summary. <strong>Please consult your doctor with questions.</strong>
        </p>
      </div>
    </div>
  );
}

