import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is missing")

client = AsyncIOMotorClient(MONGODB_URI)
db = client.carethread_db

# Collections
patients_collection = db.patients
visits_collection = db.visits
patterns_collection = db.patterns
