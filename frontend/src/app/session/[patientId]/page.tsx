"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Send, Fingerprint, HeartPulse, Loader2, Zap, Brain, Activity, Mic } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config";

export default function LiveSession() {
  const { patientId } = useParams();
  const router = useRouter();

  const [briefing, setBriefing] = useState<any>(null);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      content: "Session initialized. Ready for intake notes.",
      type: "intake",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [differentials, setDifferentials] = useState<any[]>([]);
  const [debateLogs, setDebateLogs] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [routingTier, setRoutingTier] = useState<"FAST" | "CLINICAL" | null>(null);
  const [routingReason, setRoutingReason] = useState<string>("");
  const [totalCost, setTotalCost] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput((prev) => prev + (prev ? " " : "") + finalTranscript);
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (!patientId) return;
    fetch(`${API_BASE_URL}/api/patient/${patientId}/briefing`)
      .then((res) => {
        if (!res.ok) throw new Error("Patient not found");
        return res.json();
      })
      .then((data) => setBriefing(data))
      .catch((err) => {
        console.error(err);
        router.push("/");
      });
  }, [patientId, router]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, flags, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !patientId) return;

    const newMsg = { role: "user", content: input, type: "standard" };
    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/session/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            type: m.type,
          })),
        }),
      });

      if (!res.ok) throw new Error("API Error");

      const data = await res.json();

      const updatedMessages = [...newMessages, data.message];
      setMessages(updatedMessages);

      if (data.differentials && data.differentials.length > 0) {
        setDifferentials(data.differentials);
      }

      if (data.debate_logs && data.debate_logs.length > 0) {
        setDebateLogs(data.debate_logs);
      } else {
        setDebateLogs([]);
      }

      if (data.flags && data.flags.length > 0) {
        setFlags((prev) => [...prev, ...data.flags]);
      }

      if (data.audit_logs && data.audit_logs.length > 0) {
        setAuditLogs((prev) => [...prev, ...data.audit_logs]);
      }

      if (data.routing_tier) {
        setRoutingTier(data.routing_tier);
        setRoutingReason(data.routing_reason || "");
      }

      if (data.cost_incurred) {
        setTotalCost((prev) => prev + data.cost_incurred);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = () => {
    // Persist session data to localStorage for Summary + Admin pages
    localStorage.setItem(
      "carethread_session",
      JSON.stringify({
        patientName: briefing?.patient_name ?? "Unknown",
        visitNumber: briefing?.visit_number ?? 1,
        patientId,
        differentials,
        auditLogs,
        flags,
        totalCost: parseFloat(totalCost.toFixed(6)),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          type: m.type,
        })),
        endedAt: new Date().toISOString(),
      })
    );
    router.push("/summary");
  };

  if (!briefing) {
    return (
      <div className="flex justify-center items-center h-screen bg-background text-zinc-500">
        <Loader2 className="animate-spin mr-2" size={24} /> Initializing Workspace...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-main font-bold">
            {briefing.patient_name[0]}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{briefing.patient_name}</h2>
            <p className="text-xs text-zinc-500">Live Session Active</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Cascade Router Tier Badge */}
          {routingTier && (
            <motion.div
              key={routingTier}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              title={routingReason}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-default ${
                routingTier === "CLINICAL"
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              {routingTier === "CLINICAL" ? (
                <Brain size={12} />
              ) : (
                <Zap size={12} />
              )}
              Cascade: {routingTier === "CLINICAL" ? "70B Clinical" : "8B Fast"}
            </motion.div>
          )}

          {/* Running cost */}
          {totalCost > 0 && (
            <div className="text-xs text-zinc-400 font-mono">
              ${totalCost.toFixed(5)}
            </div>
          )}

          <button
            onClick={handleEndSession}
            className="ml-4 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors"
          >
            End Session
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Memory Recall */}
        <div className="w-1/4 border-r border-border bg-zinc-50 p-6 overflow-y-auto hidden lg:block">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Fingerprint size={16} /> Memory Recall
          </h3>
          <div className="space-y-4">
            {briefing.history.map((visit: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-border shadow-sm">
                <div className="text-xs text-purple-600 font-medium mb-1">
                  Visit {visit.visit_number} • {visit.date}
                </div>
                <p className="text-sm text-zinc-700">{visit.notes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Agent Conversation */}
        <div className="flex-1 flex flex-col bg-surface relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.role === "user"
                        ? "bg-purple-main text-white rounded-br-none shadow-md"
                        : "bg-zinc-100 text-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.type === "intake" && (
                      <span className="text-xs font-medium text-purple-600 mb-1 block">System</span>
                    )}
                    <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-zinc-100 rounded-2xl rounded-bl-none p-4 flex gap-1 items-center">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </motion.div>
              )}

              {flags.map((flag, i) => (
                <motion.div
                  key={`flag-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex justify-center my-6"
                >
                  <div className="max-w-lg w-full bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <div className="flex items-start gap-4">
                      <ShieldAlert className="text-rose-500 mt-0.5 shrink-0" size={24} />
                      <div>
                        <h4 className="font-semibold text-rose-900">Allergy Conflict Detected</h4>
                        <p className="text-rose-700 text-sm mt-1">{flag.message}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>          {isListening && (
            <div className="flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-700 text-xs font-medium border-t border-purple-100 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              Ambient Listening Active... speak clearly
              <div className="flex gap-0.5 items-center ml-2 h-4">
                <span className="w-0.5 bg-purple-main h-2 animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-0.5 bg-purple-main h-3 animate-bounce" style={{ animationDelay: "0.2s" }} />
                <span className="w-0.5 bg-purple-main h-1 animate-bounce" style={{ animationDelay: "0.3s" }} />
                <span className="w-0.5 bg-purple-main h-4 animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border bg-white shrink-0">
            <div className="relative flex items-center max-w-4xl mx-auto">
              <button
                onClick={toggleListening}
                type="button"
                className={`absolute left-3 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                }`}
                title="Toggle Ambient Voice Input"
              >
                <Mic size={18} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type clinician notes or speak ambiently..."
                className="w-full bg-zinc-50 border border-border rounded-full pl-14 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-purple-main focus:border-transparent shadow-sm transition-all text-sm md:text-base"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={isTyping}
                className={`absolute right-2 w-10 h-10 flex items-center justify-center text-white rounded-full transition-colors ${
                  isTyping ? "bg-zinc-300" : "bg-purple-main hover:bg-purple-dark"
                }`}
              >
                <Send size={18} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
 
        {/* Right Panel: Live Audit Log */}
        {auditLogs.length > 0 && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "20rem", opacity: 1 }}
            className="border-l border-border bg-zinc-50 p-4 overflow-y-auto hidden xl:block shrink-0"
          >
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} /> Cascade Audit
            </h3>
            <div className="space-y-3">
              {auditLogs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-surface border border-border shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{log.action}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        log.tier === "CLINICAL"
                          ? "bg-purple-100 text-purple-700"
                          : log.tier === "LOCAL"
                          ? "bg-zinc-200 text-zinc-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {log.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">{log.reason}</p>
                  <p className="text-[10px] text-purple-600 font-mono mt-1">${log.cost.toFixed(6)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
 
      {/* Bottom Panel: Differentials */}
      <AnimatePresence>
        {(differentials.length > 0 || (debateLogs && debateLogs.length > 0)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="border-t border-border bg-surface p-6 overflow-y-auto max-h-[40vh] shrink-0"
          >
            {/* Multi-Agent Debate Logs */}
            {debateLogs && debateLogs.length > 0 && (
              <div className="mb-6 bg-zinc-950 text-zinc-100 rounded-xl p-5 shadow-lg border border-zinc-800 max-w-5xl">
                <div className="flex items-center gap-2 mb-3 border-b border-zinc-850 pb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Clinical Consultation Console (Active Expert Consensus)
                  </h4>
                </div>
                <div className="space-y-3">
                  {debateLogs.map((log: any, index: number) => {
                    const isCMO = log.agent.includes("Chief");
                    const isSpec = log.agent.includes("Specialist");
                    const colorClass = isCMO ? "text-purple-400 font-semibold" : isSpec ? "text-blue-400 font-semibold" : "text-amber-400 font-semibold";
                    return (
                      <div key={index} className="text-xs md:text-sm leading-relaxed border-l-2 border-zinc-800 pl-3 py-0.5">
                        <span className={`${colorClass}`}>{log.agent}:</span>{" "}
                        <span className="text-zinc-300 font-mono">{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {differentials.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse className="text-rose-500" size={20} />
                  <h3 className="font-semibold text-foreground">AI Differential Diagnoses</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    70B Model Panel · Consensus Reached
                  </span>
                </div>
    
                <div className="flex gap-4 pb-2 overflow-x-auto">
                  {differentials.map((diff, i) => (
                    <div
                      key={i}
                      className={`min-w-[300px] border rounded-xl p-4 shadow-sm relative overflow-hidden ${
                        diff.urgent ? "bg-rose-50 border-rose-300" : "bg-white border-zinc-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0 left-0 w-full h-1 ${
                          diff.urgent ? "bg-rose-600" : "bg-purple-400"
                        }`}
                      />
                      <div className="flex justify-between items-start mb-2">
                        <h4
                          className={`font-bold ${
                            diff.urgent ? "text-rose-900" : "text-foreground"
                          }`}
                        >
                          {diff.condition}
                        </h4>
                        <span
                          className={`${
                            diff.urgent ? "text-rose-600" : "text-purple-600"
                          } font-bold`}
                        >
                          {diff.confidence}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full mb-3">
                        <div
                          className={`${
                            diff.urgent ? "bg-rose-600" : "bg-purple-400"
                          } h-full rounded-full`}
                          style={{ width: `${diff.confidence}%` }}
                        />
                      </div>
                      {diff.urgent && (
                        <p className="text-xs text-rose-700 font-medium mb-1">URGENT workup recommended</p>
                      )}
                      <p className="text-xs text-zinc-500">Evidence: {diff.evidence}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
