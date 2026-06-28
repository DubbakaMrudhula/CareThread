import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

from database import patients_collection, visits_collection, db
from llm_router import (
    classify_complexity,
    get_agent_response,
    generate_differentials,
    generate_soap_note,
    COMPLEX_MODEL,
    FAST_MODEL,
)

app = FastAPI(title="CareThread Live API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class SessionMessage(BaseModel):
    role: str
    content: str
    type: str = "standard"


class ProcessMessageRequest(BaseModel):
    patient_id: str
    messages: List[SessionMessage]


class AgentResponse(BaseModel):
    message: SessionMessage
    risk_score_update: Optional[int] = None
    flags: List[dict] = []
    differentials: List[dict] = []
    cost_incurred: float
    audit_logs: List[dict] = []
    routing_tier: str = "FAST"
    routing_reason: str = ""


class SoapRequest(BaseModel):
    patient_id: str
    messages: List[dict]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "CareThread Live API is running"}


@app.get("/api/patients")
async def get_patients():
    """Returns the list of patients from MongoDB."""
    patients = []
    async for patient in patients_collection.find({}):
        patient["id"] = patient.pop("_id")
        patients.append(patient)
    return patients


@app.get("/api/patient/{patient_id}/briefing")
async def get_previsit_briefing(patient_id: str):
    """
    Retrieves the patient briefing from MongoDB, including visit history,
    open flags, and longitudinal risk score.
    """
    patient = await patients_collection.find_one({"_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits = []
    async for visit in visits_collection.find({"patient_id": patient_id}).sort("visit_number", -1):
        visit["_id"] = str(visit["_id"])
        visits.append(visit)

    last_seen = visits[0]["date"] if visits else "Unknown"
    visit_number = len(visits) + 1

    # Generate flags based on patient profile
    open_flags = []
    if "Ibuprofen" in patient.get("allergies", []):
        open_flags.append({
            "type": "allergy",
            "title": "Ibuprofen - Severe stomach reaction",
            "severity": "critical",
        })
    if patient.get("risk_score", 0) > 50:
        open_flags.append({
            "type": "escalating_symptom",
            "title": "High longitudinal risk score detected",
            "severity": "high",
        })

    return {
        "patient_name": patient["name"],
        "dob": patient["dob"],
        "visit_number": visit_number,
        "last_seen": last_seen,
        "risk_score": patient.get("risk_score", 0),
        "open_flags": open_flags,
        "history": visits,
    }


@app.post("/api/session/message", response_model=AgentResponse)
async def process_message(req: ProcessMessageRequest):
    """
    Real Cascade Router & Multi-Agent Orchestrator.

    Step 1 — Triage (Fast model): Classify whether the clinical input
              requires high-complexity reasoning. Log routing decision.
    Step 2 — Response (routed model): Generate agent response at the
              appropriate model tier.
    Step 3 — Differentials (70B, conditional): If complexity is HIGH,
              call generate_differentials() for a real structured JSON response.
    """
    last_user_msg = req.messages[-1].content if req.messages else ""

    patient = await patients_collection.find_one({"_id": req.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Load visit history for context
    visits = []
    async for visit in visits_collection.find({"patient_id": req.patient_id}).sort("visit_number", -1):
        visit["_id"] = str(visit["_id"])
        visits.append(visit)

    flags = []
    audit_logs = []
    cost_incurred = 0.0

    # --- Drug conflict check (local structured fact DB — zero LLM cost) ----
    if "ibuprofen" in last_user_msg.lower() or "anti-inflammatory" in last_user_msg.lower():
        if "Ibuprofen" in patient.get("allergies", []):
            flags.append({
                "type": "allergy_conflict",
                "message": "⚠️ Ibuprofen allergy on record. This NSAID class may require review before prescribing.",
            })
            audit_logs.append({
                "action": "Drug Conflict Check",
                "model": "Local Fact DB",
                "tier": "LOCAL",
                "cost": 0.0,
                "reason": "Structured allergy lookup — no LLM required",
            })

    # --- Step 1: Cascade triage (fast model classifies complexity) ----------
    patient_context = (
        f"Allergies: {', '.join(patient.get('allergies', []))}. "
        f"Risk score: {patient.get('risk_score', 0)}. "
        f"Recent visits: {len(visits)}."
    )
    triage = classify_complexity(last_user_msg, patient_context)
    complexity = triage["complexity"]
    cost_incurred += triage["cost_incurred"]

    audit_logs.append({
        "action": triage["action"],
        "model": triage["model_used"],
        "tier": "FAST",
        "cost": triage["cost_incurred"],
        "reason": f"Cascade triage: {triage['reason']}",
    })

    # --- Step 2: Agent response (routed model) ------------------------------
    llm_response = get_agent_response(req.messages, complexity)
    cost_incurred += llm_response["cost_incurred"]

    audit_logs.append({
        "action": llm_response["action"],
        "model": llm_response["model_used"],
        "tier": llm_response["tier"],
        "cost": llm_response["cost_incurred"],
        "reason": (
            f"Routed to {llm_response['tier']} tier — "
            f"{'multi-system clinical reasoning required' if complexity == 'high' else 'routine clinical input'}"
        ),
    })

    # --- Step 3: Differential generation (70B, high complexity only) -------
    differentials = []
    risk_score_update = None

    if complexity == "high":
        diff_result = generate_differentials(req.messages, visits)
        differentials = diff_result["differentials"]
        cost_incurred += diff_result["cost_incurred"]

        audit_logs.append({
            "action": diff_result["action"],
            "model": diff_result["model_used"],
            "tier": diff_result["tier"],
            "cost": diff_result["cost_incurred"],
            "reason": "High-complexity case: structured differential JSON generated by 70B model",
        })

        # Update longitudinal risk score
        risk_score_update = min(100, patient.get("risk_score", 0) + 7)
        await patients_collection.update_one(
            {"_id": req.patient_id},
            {"$set": {"risk_score": risk_score_update}},
        )

    return AgentResponse(
        message=SessionMessage(
            role="agent",
            content=llm_response["content"],
            type="standard",
        ),
        cost_incurred=round(cost_incurred, 6),
        flags=flags,
        differentials=differentials,
        risk_score_update=risk_score_update,
        audit_logs=audit_logs,
        routing_tier=llm_response["tier"],
        routing_reason=triage["reason"],
    )


@app.post("/api/session/soap")
async def generate_soap(req: SoapRequest):
    """
    Generates a SOAP note from the full session conversation using the
    70B clinical reasoning model.
    """
    patient = await patients_collection.find_one({"_id": req.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits = []
    async for visit in visits_collection.find({"patient_id": req.patient_id}).sort("visit_number", 1):
        visit["_id"] = str(visit["_id"])
        visits.append(visit)

    result = generate_soap_note(req.messages, patient, visits)

    return {
        "soap": result["soap"],
        "model_used": result["model_used"],
        "cost_incurred": result["cost_incurred"],
        "audit_log": {
            "action": "SOAP Note Generation",
            "model": result["model_used"],
            "tier": "CLINICAL",
            "cost": result["cost_incurred"],
            "reason": "Post-session clinical documentation via 70B model",
        },
    }
