import os
from fastapi import FastAPI, HTTPException, Depends, status, Response, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime

from database import (
    ensure_indexes,
    users_collection,
    doctors_collection,
    patients_collection,
    doctor_patient_collection,
    visits_collection,
    documents_collection,
    audit_logs_collection,
)
from models import (
    create_user_doc,
    create_doctor_doc,
    create_patient_doc,
    create_doctor_patient_rel_doc,
    create_visit_doc,
    create_document_doc,
    create_audit_log_doc,
)
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
    TokenData
)
from llm_router import (
    classify_complexity,
    get_agent_response,
    generate_differentials,
    generate_soap_note,
)

app = FastAPI(title="CareThread Secure API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    ensure_indexes()

# ---------------------------------------------------------------------------
# Helper function for HIPAA Audit Logging
# ---------------------------------------------------------------------------
def log_audit_action(user_id: str, action: str, resource_type: str, resource_id: str = None, ip: str = "127.0.0.1"):
    doc = create_audit_log_doc(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip,
    )
    audit_logs_collection.insert_one(doc)

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # 'doctor' or 'patient'
    name: str
    # Doctor specific fields
    license: Optional[str] = None
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    phone: Optional[str] = None
    # Patient specific fields
    dob: Optional[str] = None  # YYYY-MM-DD
    gender: Optional[str] = None  # 'M', 'F', 'Other'
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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

class VisitCreate(BaseModel):
    patient_id: str
    visit_date: str
    visit_type: str
    diagnosis: str
    prescription: str
    notes: str
    vital_signs: Optional[dict] = None

class PatientCreate(BaseModel):
    email: EmailStr
    name: str
    dob: str
    gender: str
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

# ---------------------------------------------------------------------------
# Authentication Routes
# ---------------------------------------------------------------------------
@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    # Check if user already exists
    existing_user = users_collection.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = req.role.lower()
    if role not in ["doctor", "patient"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'doctor' or 'patient'")

    user_doc = create_user_doc(
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=role,
    )
    users_collection.insert_one(user_doc)
    user_id = user_doc["_id"]

    if role == "doctor":
        if not req.license:
            raise HTTPException(status_code=400, detail="License is required for doctors")
        doctor_doc = create_doctor_doc(
            user_id=user_id,
            name=req.name,
            license=req.license,
            specialization=req.specialization,
            hospital=req.hospital,
            phone=req.phone,
        )
        doctors_collection.insert_one(doctor_doc)
    else:
        patient_doc = create_patient_doc(
            user_id=user_id,
            name=req.name,
            dob=req.dob or "1990-01-01",
            gender=req.gender or "Other",
            blood_type=req.blood_type,
            emergency_contact=req.emergency_contact,
            medical_history=req.medical_history,
            allergies=req.allergies,
        )
        patients_collection.insert_one(patient_doc)

    log_audit_action(user_id, "REGISTER", "user", user_id)
    return {"message": "Registration successful", "user_id": user_id, "role": role}

@app.post("/api/auth/login")
def login_user(req: LoginRequest, response: Response):
    user = users_collection.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"user_id": user["_id"], "email": user["email"], "role": user["role"]}
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=21600,
        samesite="lax"
    )
    log_audit_action(user["_id"], "LOGIN", "user", user["_id"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "email": user["email"],
        "user_id": user["_id"]
    }

@app.post("/api/auth/logout")
def logout(response: Response, current_user: TokenData = Depends(get_current_user)):
    response.delete_cookie("access_token")
    log_audit_action(current_user.user_id, "LOGOUT", "user", current_user.user_id)
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
def get_me(current_user: TokenData = Depends(get_current_user)):
    user = users_collection.find_one({"_id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = {"email": user["email"], "role": user["role"], "id": user["_id"]}

    if user["role"] == "doctor":
        doctor = doctors_collection.find_one({"user_id": current_user.user_id})
        if doctor:
            profile.update({
                "name": doctor["name"],
                "license": doctor["license"],
                "specialization": doctor.get("specialization"),
                "hospital": doctor.get("hospital"),
                "phone": doctor.get("phone"),
                "doctor_id": doctor["_id"],
            })
    elif user["role"] == "patient":
        patient = patients_collection.find_one({"user_id": current_user.user_id})
        if patient:
            profile.update({
                "name": patient["name"],
                "dob": patient["dob"],
                "gender": patient["gender"],
                "blood_type": patient.get("blood_type"),
                "emergency_contact": patient.get("emergency_contact"),
                "medical_history": patient.get("medical_history"),
                "allergies": patient.get("allergies"),
                "risk_score": patient.get("risk_score", 10),
                "patient_id": patient["_id"],
            })
    return profile

# ---------------------------------------------------------------------------
# Doctor Routes
# ---------------------------------------------------------------------------
@app.get("/api/doctors/patients")
def list_patients(current_user: TokenData = Depends(require_role(["doctor"]))):
    doctor = doctors_collection.find_one({"user_id": current_user.user_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Get patients assigned to this doctor
    relationships = list(doctor_patient_collection.find({
        "doctor_id": doctor["_id"],
        "status": "active",
    }))
    patient_ids = [r["patient_id"] for r in relationships]
    
    patients = list(patients_collection.find({"_id": {"$in": patient_ids}})) if patient_ids else []
    
    # Audit log
    log_audit_action(current_user.user_id, "LIST_PATIENTS", "patients")
    
    result = []
    for p in patients:
        result.append({
            "id": p["_id"],
            "name": p["name"],
            "dob": p["dob"],
            "gender": p["gender"],
            "blood_type": p.get("blood_type"),
            "risk_score": p.get("risk_score", 10),
            "allergies": p.get("allergies"),
        })
    return result

@app.post("/api/doctors/patients")
def add_patient(req: PatientCreate, current_user: TokenData = Depends(require_role(["doctor"]))):
    doctor = doctors_collection.find_one({"user_id": current_user.user_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Create User account for patient with a default password
    existing_user = users_collection.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User email already exists")

    user_doc = create_user_doc(
        email=req.email,
        password_hash=get_password_hash("password123"),  # default password
        role="patient",
    )
    users_collection.insert_one(user_doc)

    patient_doc = create_patient_doc(
        user_id=user_doc["_id"],
        name=req.name,
        dob=req.dob,
        gender=req.gender,
        blood_type=req.blood_type,
        emergency_contact=req.emergency_contact,
        medical_history=req.medical_history,
        allergies=req.allergies,
        risk_score=10,
    )
    patients_collection.insert_one(patient_doc)

    # Create relationship
    rel_doc = create_doctor_patient_rel_doc(doctor_id=doctor["_id"], patient_id=patient_doc["_id"])
    doctor_patient_collection.insert_one(rel_doc)

    log_audit_action(current_user.user_id, "CREATE_PATIENT", "patient", patient_doc["_id"])
    return {"message": "Patient added and assigned successfully", "patient_id": patient_doc["_id"]}

# ---------------------------------------------------------------------------
# Patient Routes
# ---------------------------------------------------------------------------
@app.get("/api/patients/profile")
def get_patient_profile(current_user: TokenData = Depends(require_role(["patient"]))):
    patient = patients_collection.find_one({"user_id": current_user.user_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    log_audit_action(current_user.user_id, "VIEW_PROFILE", "patient", patient["_id"])
    return {
        "id": patient["_id"],
        "name": patient["name"],
        "dob": patient["dob"],
        "gender": patient["gender"],
        "blood_type": patient.get("blood_type"),
        "emergency_contact": patient.get("emergency_contact"),
        "medical_history": patient.get("medical_history"),
        "allergies": patient.get("allergies"),
        "risk_score": patient.get("risk_score", 10),
    }

@app.get("/api/patients/visits")
def get_patient_visits(current_user: TokenData = Depends(require_role(["patient"]))):
    patient = patients_collection.find_one({"user_id": current_user.user_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    visits = list(visits_collection.find({"patient_id": patient["_id"]}).sort("visit_date", -1))
    log_audit_action(current_user.user_id, "VIEW_VISITS", "visits")

    result = []
    for v in visits:
        result.append({
            "id": v["_id"],
            "patient_id": v["patient_id"],
            "doctor_id": v["doctor_id"],
            "visit_date": v["visit_date"],
            "visit_type": v["visit_type"],
            "diagnosis": v.get("diagnosis"),
            "prescription": v.get("prescription"),
            "notes": v.get("notes"),
            "vital_signs": v.get("vital_signs"),
            "created_at": v.get("created_at", "").isoformat() if v.get("created_at") else None,
            "updated_at": v.get("updated_at", "").isoformat() if v.get("updated_at") else None,
        })
    return result

# ---------------------------------------------------------------------------
# Shared and AI Clinical Intelligence endpoints
# ---------------------------------------------------------------------------
@app.get("/api/patients")
def get_patients_compatibility():
    """General dashboard listing for doctors compatibility."""
    patients = list(patients_collection.find())
    return [
        {
            "id": p["_id"],
            "name": p["name"],
            "dob": p["dob"],
            "gender": p["gender"],
            "blood_type": p.get("blood_type"),
            "risk_score": p.get("risk_score", 10),
        }
        for p in patients
    ]

@app.get("/api/patient/{patient_id}/briefing")
def get_previsit_briefing(patient_id: str):
    """Retrieves patient briefing including visit history and active allergy flags."""
    patient = patients_collection.find_one({"_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits_list = list(visits_collection.find({"patient_id": patient_id}).sort("visit_date", -1))
    
    history = []
    for idx, v in enumerate(reversed(visits_list)):
        history.append({
            "visit_number": idx + 1,
            "date": v["visit_date"],
            "notes": v.get("notes", ""),
        })
    history.reverse() # newest first

    last_seen = visits_list[0]["visit_date"] if visits_list else "Unknown"
    visit_number = len(visits_list) + 1

    open_flags = []
    allergies = patient.get("allergies") or ""
    risk_score = patient.get("risk_score", 10)

    if "Ibuprofen" in allergies:
        open_flags.append({
            "type": "allergy",
            "title": "Ibuprofen - Severe stomach reaction",
            "severity": "critical",
        })
    if risk_score > 50:
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
        "risk_score": risk_score,
        "open_flags": open_flags,
        "history": history,
    }

@app.post("/api/session/message", response_model=AgentResponse)
def process_message(req: ProcessMessageRequest):
    last_user_msg = req.messages[-1].content if req.messages else ""

    patient = patients_collection.find_one({"_id": req.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits = list(visits_collection.find({"patient_id": req.patient_id}))
    history = [{"visit_number": idx + 1, "date": v["visit_date"], "notes": v.get("notes", "")} for idx, v in enumerate(visits)]

    flags = []
    audit_logs = []
    cost_incurred = 0.0

    # 1. Drug Allergy Check
    allergies = patient.get("allergies") or ""
    if "ibuprofen" in last_user_msg.lower() or "anti-inflammatory" in last_user_msg.lower():
        if "Ibuprofen" in allergies:
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

    # 2. Cascade Triage
    risk_score = patient.get("risk_score", 10)
    patient_context = (
        f"Allergies: {allergies or 'None'}. "
        f"Risk score: {risk_score}. "
        f"Recent visits: {len(history)}."
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

    # 3. Agent Response
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

    # 4. Differential diagnoses (70B, clinical model)
    differentials = []
    risk_score_update = None

    if complexity == "high":
        diff_result = generate_differentials(req.messages, history)
        differentials = diff_result["differentials"]
        cost_incurred += diff_result["cost_incurred"]

        audit_logs.append({
            "action": diff_result["action"],
            "model": diff_result["model_used"],
            "tier": diff_result["tier"],
            "cost": diff_result["cost_incurred"],
            "reason": "High-complexity case: structured differential JSON generated by 70B model",
        })

        # Update patient risk score
        risk_score_update = min(100, risk_score + 7)
        patients_collection.update_one(
            {"_id": req.patient_id},
            {"$set": {"risk_score": risk_score_update, "updated_at": datetime.utcnow()}},
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
def generate_soap(req: SoapRequest):
    patient = patients_collection.find_one({"_id": req.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits = list(visits_collection.find({"patient_id": req.patient_id}))
    history = [{"visit_number": idx + 1, "date": v["visit_date"], "notes": v.get("notes", "")} for idx, v in enumerate(visits)]

    patient_dict = {
        "name": patient["name"],
        "dob": patient["dob"],
    }

    result = generate_soap_note(req.messages, patient_dict, history)
    return {
        "soap": result["soap"],
        "model_used": result["model_used"],
        "cost_incurred": result["cost_incurred"],
    }

# ---------------------------------------------------------------------------
# Create visits and documents routes
# ---------------------------------------------------------------------------
@app.post("/api/doctors/visits")
def create_visit(req: VisitCreate, current_user: TokenData = Depends(require_role(["doctor"]))):
    doctor = doctors_collection.find_one({"user_id": current_user.user_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    visit_doc = create_visit_doc(
        patient_id=req.patient_id,
        doctor_id=doctor["_id"],
        visit_date=req.visit_date,
        visit_type=req.visit_type,
        diagnosis=req.diagnosis,
        prescription=req.prescription,
        notes=req.notes,
        vital_signs=req.vital_signs,
    )
    visits_collection.insert_one(visit_doc)

    log_audit_action(current_user.user_id, "CREATE_VISIT", "medical_visit", visit_doc["_id"])
    return {"message": "Visit created successfully", "visit_id": visit_doc["_id"]}

@app.post("/api/doctors/documents")
async def upload_document(
    patient_id: str = Form(...),
    visit_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_role(["doctor"])),
):
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{file_id}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    doc = create_document_doc(
        patient_id=patient_id,
        visit_id=visit_id,
        file_name=file.filename,
        file_type=file.content_type,
        file_path=file_path,
        uploaded_by=current_user.user_id,
    )
    documents_collection.insert_one(doc)

    log_audit_action(current_user.user_id, "UPLOAD_DOCUMENT", "medical_document", doc["_id"])
    return {"message": "Document uploaded successfully", "document_id": doc["_id"]}

@app.get("/api/admin/audit-logs")
def get_audit_logs(current_user: TokenData = Depends(require_role(["doctor", "admin"]))):
    logs = list(audit_logs_collection.find().sort("timestamp", -1).limit(100))
    result = []
    for l in logs:
        # Find user email
        user_email = "Unknown"
        user = users_collection.find_one({"_id": l["user_id"]})
        if user:
            user_email = user["email"]
            
        result.append({
            "id": l["_id"],
            "user_email": user_email,
            "action": l["action"],
            "resource_type": l["resource_type"],
            "resource_id": l.get("resource_id"),
            "timestamp": l["timestamp"].isoformat() if l.get("timestamp") else None,
            "ip_address": l.get("ip_address"),
        })
    return result
