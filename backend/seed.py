import asyncio
from database import patients_collection, visits_collection, db

async def seed_database():
    # Clear existing data
    await patients_collection.delete_many({})
    await visits_collection.delete_many({})
    
    # 1. Priya Mehta (Original demo patient - Escalating Fatigue / Cardiac risk)
    priya = {
        "_id": "PT-2847",
        "name": "Priya Mehta",
        "dob": "1982-05-14",
        "risk_score": 52,
        "allergies": ["Ibuprofen"],
        "chronic_conditions": [],
        "medications": []
    }
    
    priya_visits = [
        {
            "patient_id": "PT-2847",
            "visit_number": 1,
            "date": "2024-01-12",
            "notes": "Patient presented with a severe stomach reaction to Ibuprofen. Noted allergy."
        },
        {
            "patient_id": "PT-2847",
            "visit_number": 2,
            "date": "2024-02-05",
            "notes": "Patient mentioned feeling tired all the time but attributed it to work stress."
        },
        {
            "patient_id": "PT-2847",
            "visit_number": 3,
            "date": "2024-02-28",
            "notes": "Patient reported fatigue has been getting worse over the last month."
        }
    ]

    # 2. John Doe (Routine / Asthma)
    john = {
        "_id": "PT-1002",
        "name": "John Doe",
        "dob": "1990-11-20",
        "risk_score": 12,
        "allergies": ["Penicillin"],
        "chronic_conditions": ["Mild Asthma"],
        "medications": ["Albuterol Inhaler"]
    }
    
    john_visits = [
        {
            "patient_id": "PT-1002",
            "visit_number": 1,
            "date": "2023-10-15",
            "notes": "Routine checkup. Asthma is well-controlled. Refilled Albuterol."
        }
    ]

    # 3. Maria Garcia (Chronic Autoimmune)
    maria = {
        "_id": "PT-3391",
        "name": "Maria Garcia",
        "dob": "1975-08-03",
        "risk_score": 68,
        "allergies": [],
        "chronic_conditions": ["Rheumatoid Arthritis"],
        "medications": ["Methotrexate"]
    }

    maria_visits = [
        {
            "patient_id": "PT-3391",
            "visit_number": 1,
            "date": "2023-09-10",
            "notes": "Diagnosed with RA. Started on Methotrexate."
        },
        {
            "patient_id": "PT-3391",
            "visit_number": 2,
            "date": "2023-12-05",
            "notes": "Joint pain is somewhat managed, but patient reports occasional nausea post-medication."
        }
    ]

    await patients_collection.insert_many([priya, john, maria])
    await visits_collection.insert_many(priya_visits + john_visits + maria_visits)

    print("Database seeded successfully with 3 synthetic patients.")

if __name__ == "__main__":
    asyncio.run(seed_database())
