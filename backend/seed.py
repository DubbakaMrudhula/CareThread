"""
Seed script for CareThread MongoDB database.
Clears all collections and inserts demo data for development/testing.
"""

from database import (
    users_collection,
    doctors_collection,
    patients_collection,
    doctor_patient_collection,
    visits_collection,
    documents_collection,
    audit_logs_collection,
    ensure_indexes,
)
from models import (
    create_user_doc,
    create_doctor_doc,
    create_patient_doc,
    create_doctor_patient_rel_doc,
    create_visit_doc,
)
from auth import get_password_hash


def seed_database():
    print("Ensuring indexes...")
    ensure_indexes()

    # Clear existing data
    print("Clearing old data...")
    visits_collection.delete_many({})
    documents_collection.delete_many({})
    doctor_patient_collection.delete_many({})
    patients_collection.delete_many({})
    doctors_collection.delete_many({})
    audit_logs_collection.delete_many({})
    users_collection.delete_many({})

    print("Seeding new platform users...")

    # 1. Create Users
    doc_user = create_user_doc(
        email="doctor@carethread.com",
        password_hash=get_password_hash("password123"),
        role="doctor",
    )
    priya_user = create_user_doc(
        email="priya@patient.com",
        password_hash=get_password_hash("password123"),
        role="patient",
    )
    john_user = create_user_doc(
        email="john@patient.com",
        password_hash=get_password_hash("password123"),
        role="patient",
    )
    maria_user = create_user_doc(
        email="maria@patient.com",
        password_hash=get_password_hash("password123"),
        role="patient",
    )

    users_collection.insert_many([doc_user, priya_user, john_user, maria_user])

    # 2. Create Doctor
    doctor = create_doctor_doc(
        _id="DOC-9901",
        user_id=doc_user["_id"],
        name="Dr. Helen Carter",
        license="LIC-882741-CA",
        specialization="General Cardiology",
        hospital="St. Jude Medical Center",
        phone="555-019-2834",
    )
    doctors_collection.insert_one(doctor)

    # 3. Create Patients
    priya = create_patient_doc(
        _id="PT-2847",
        user_id=priya_user["_id"],
        name="Priya Mehta",
        dob="1982-05-14",
        gender="F",
        blood_type="O+",
        emergency_contact="Raj Mehta (Spouse) - 555-014-9982",
        medical_history="Chronic mild anxiety, family history of hypertension.",
        allergies="Ibuprofen",
        risk_score=52,
    )
    john = create_patient_doc(
        _id="PT-1002",
        user_id=john_user["_id"],
        name="John Doe",
        dob="1990-11-20",
        gender="M",
        blood_type="A-",
        emergency_contact="Jane Doe (Mother) - 555-012-3847",
        medical_history="Mild asthma since childhood.",
        allergies="Penicillin",
        risk_score=12,
    )
    maria = create_patient_doc(
        _id="PT-3391",
        user_id=maria_user["_id"],
        name="Maria Garcia",
        dob="1975-08-03",
        gender="F",
        blood_type="B+",
        emergency_contact="Carlos Garcia (Brother) - 555-015-8823",
        medical_history="Diagnosed Rheumatoid Arthritis.",
        allergies="",
        risk_score=68,
    )

    patients_collection.insert_many([priya, john, maria])

    # 4. Associate Doctor and Patients
    rel1 = create_doctor_patient_rel_doc(doctor_id=doctor["_id"], patient_id=priya["_id"])
    rel2 = create_doctor_patient_rel_doc(doctor_id=doctor["_id"], patient_id=john["_id"])
    rel3 = create_doctor_patient_rel_doc(doctor_id=doctor["_id"], patient_id=maria["_id"])
    doctor_patient_collection.insert_many([rel1, rel2, rel3])

    # 5. Create Medical Visits
    visits = [
        # Priya Mehta
        create_visit_doc(
            patient_id=priya["_id"],
            doctor_id=doctor["_id"],
            visit_date="2024-01-12",
            visit_type="consultation",
            diagnosis="NSAID Gastric Reaction",
            prescription="Discontinue Ibuprofen; Acetaminophen for pain control.",
            notes="Patient presented with a severe stomach reaction to Ibuprofen. Noted allergy.",
            vital_signs={"temperature": 37.0, "systolic": 120, "diastolic": 80, "heartRate": 72, "weight": 65.8, "glucose": 85.0, "spo2": 98.0},
        ),
        create_visit_doc(
            patient_id=priya["_id"],
            doctor_id=doctor["_id"],
            visit_date="2024-02-05",
            visit_type="check-up",
            diagnosis="Fatigue, unspecified",
            prescription="None. Check blood panel.",
            notes="Patient mentioned feeling tired all the time but attributed it to work stress.",
            vital_signs={"temperature": 36.8, "systolic": 122, "diastolic": 82, "heartRate": 75, "weight": 65.5, "glucose": 95.0, "spo2": 97.0},
        ),
        create_visit_doc(
            patient_id=priya["_id"],
            doctor_id=doctor["_id"],
            visit_date="2024-02-28",
            visit_type="follow-up",
            diagnosis="Escalating Fatigue",
            prescription="B12 Supplements daily.",
            notes="Patient reported fatigue has been getting worse over the last month.",
            vital_signs={"temperature": 37.0, "systolic": 125, "diastolic": 85, "heartRate": 78, "weight": 64.9, "glucose": 105.0, "spo2": 96.0},
        ),
        # John Doe
        create_visit_doc(
            patient_id=john["_id"],
            doctor_id=doctor["_id"],
            visit_date="2023-10-15",
            visit_type="check-up",
            diagnosis="Asthma Control Check",
            prescription="Albuterol Inhaler (refill)",
            notes="Routine checkup. Asthma is well-controlled. Refilled Albuterol.",
            vital_signs={"temperature": 36.7, "systolic": 118, "diastolic": 75, "heartRate": 68, "weight": 77.1, "spo2": 99.0},
        ),
        # Maria Garcia
        create_visit_doc(
            patient_id=maria["_id"],
            doctor_id=doctor["_id"],
            visit_date="2023-09-10",
            visit_type="consultation",
            diagnosis="Rheumatoid Arthritis Flare",
            prescription="Methotrexate 7.5mg weekly.",
            notes="Diagnosed with RA. Started on Methotrexate.",
            vital_signs={"temperature": 37.1, "systolic": 130, "diastolic": 85, "heartRate": 80, "weight": 59.9, "glucose": 90.0, "spo2": 97.0},
        ),
        create_visit_doc(
            patient_id=maria["_id"],
            doctor_id=doctor["_id"],
            visit_date="2023-12-05",
            visit_type="follow-up",
            diagnosis="RA follow-up",
            prescription="Continue Methotrexate. Add Folic Acid 1mg daily.",
            notes="Joint pain is somewhat managed, but patient reports occasional nausea post-medication.",
            vital_signs={"temperature": 36.9, "systolic": 128, "diastolic": 82, "heartRate": 76, "weight": 59.4, "glucose": 92.0, "spo2": 98.0},
        ),
    ]
    visits_collection.insert_many(visits)

    print("MongoDB database seeded successfully!")


if __name__ == "__main__":
    seed_database()
