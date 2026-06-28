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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-purple-50 text-purple-main mb-4">
              <Stethoscope size={32} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              CareThread <span className="text-purple-main font-light">Secure</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Clinician-patient portal with real-time Cascade Triage
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {authError}
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Dr. Sarah Jenkins or John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Role Type</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
                  >
                    <option value="doctor">Medical Practitioner (Doctor)</option>
                    <option value="patient">Patient Portal</option>
                  </select>
                </div>

                {authRole === "doctor" ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Medical License ID</label>
                    <input
                      type="text"
                      required
                      value={authLicense}
                      onChange={(e) => setAuthLicense(e.target.value)}
                      placeholder="LIC-123456"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={authDob}
                        onChange={(e) => setAuthDob(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Gender</label>
                      <select
                        value={authGender}
                        onChange={(e) => setAuthGender(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-400" size={16} />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-main"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-main hover:bg-purple-dark text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-md mt-6"
            >
              {isLogin ? "Sign In" : "Register Credentials"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError("");
              }}
              className="text-xs text-purple-main font-semibold hover:underline"
            >
              {isLogin ? "Create an account" : "Back to login"}
            </button>
          </div>
        </motion.div>
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

      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
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
