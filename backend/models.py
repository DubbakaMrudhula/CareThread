"""
MongoDB document factory functions.

Each function returns a plain dict ready for insert_one() / insert_many().
The '_id' field uses string UUIDs for compatibility with the existing frontend.
"""

import uuid
from datetime import datetime


def create_user_doc(email: str, password_hash: str, role: str, _id: str = None) -> dict:
    now = datetime.utcnow()
    return {
        "_id": _id or str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": role,  # 'doctor', 'patient', 'admin'
        "created_at": now,
        "updated_at": now,
    }


def create_doctor_doc(
    user_id: str,
    name: str,
    license: str,
    specialization: str = None,
    hospital: str = None,
    phone: str = None,
    _id: str = None,
) -> dict:
    return {
        "_id": _id or str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "license": license,
        "specialization": specialization,
        "hospital": hospital,
        "phone": phone,
        "created_at": datetime.utcnow(),
    }


def create_patient_doc(
    user_id: str,
    name: str,
    dob: str,
    gender: str,
    blood_type: str = None,
    emergency_contact: str = None,
    medical_history: str = None,
    allergies: str = None,
    risk_score: int = 10,
    _id: str = None,
) -> dict:
    now = datetime.utcnow()
    return {
        "_id": _id or str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "dob": dob,  # YYYY-MM-DD
        "gender": gender,  # 'M', 'F', 'Other'
        "blood_type": blood_type,
        "emergency_contact": emergency_contact,
        "medical_history": medical_history,
        "allergies": allergies,
        "risk_score": risk_score,
        "created_at": now,
        "updated_at": now,
    }


def create_doctor_patient_rel_doc(
    doctor_id: str, patient_id: str, status: str = "active", _id: str = None
) -> dict:
    return {
        "_id": _id or str(uuid.uuid4()),
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "assigned_date": datetime.utcnow(),
        "status": status,
    }


def create_visit_doc(
    patient_id: str,
    doctor_id: str,
    visit_date: str,
    visit_type: str,
    diagnosis: str = None,
    prescription: str = None,
    notes: str = None,
    vital_signs: dict = None,
    _id: str = None,
) -> dict:
    now = datetime.utcnow()
    return {
        "_id": _id or str(uuid.uuid4()),
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "visit_date": visit_date,  # YYYY-MM-DD
        "visit_type": visit_type,  # 'consultation', 'check-up', 'surgery', 'follow-up'
        "diagnosis": diagnosis,
        "prescription": prescription,
        "notes": notes,
        "vital_signs": vital_signs,
        "created_at": now,
        "updated_at": now,
    }


def create_document_doc(
    patient_id: str,
    file_name: str,
    file_type: str,
    file_path: str,
    uploaded_by: str,
    visit_id: str = None,
    _id: str = None,
) -> dict:
    return {
        "_id": _id or str(uuid.uuid4()),
        "visit_id": visit_id,
        "patient_id": patient_id,
        "file_name": file_name,
        "file_type": file_type,
        "file_path": file_path,
        "uploaded_date": datetime.utcnow(),
        "uploaded_by": uploaded_by,
    }


def create_audit_log_doc(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str = None,
    ip_address: str = None,
    _id: str = None,
) -> dict:
    return {
        "_id": _id or str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "timestamp": datetime.utcnow(),
        "ip_address": ip_address,
    }
