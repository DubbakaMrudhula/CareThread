import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is missing")

client = MongoClient(MONGODB_URI)
db = client.carethread_db

# Collections
users_collection = db.users
doctors_collection = db.doctors
patients_collection = db.patients
doctor_patient_collection = db.doctor_patient_relationships
visits_collection = db.visits
documents_collection = db.documents
audit_logs_collection = db.audit_logs


def ensure_indexes():
    """Create indexes for commonly queried fields."""
    users_collection.create_index([("email", ASCENDING)], unique=True)
    doctors_collection.create_index([("user_id", ASCENDING)], unique=True)
    doctors_collection.create_index([("license", ASCENDING)], unique=True)
    patients_collection.create_index(
        [("user_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"user_id": {"$type": "string"}},
    )
    doctor_patient_collection.create_index([("doctor_id", ASCENDING), ("patient_id", ASCENDING)])
    visits_collection.create_index([("patient_id", ASCENDING), ("visit_date", DESCENDING)])
    audit_logs_collection.create_index([("timestamp", DESCENDING)])


def get_db():
    """FastAPI dependency — returns the MongoDB database object."""
    return db
