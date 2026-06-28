import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is missing")

groq_client = Groq(api_key=GROQ_API_KEY)

# Cascade Router model tiers
COMPLEX_MODEL = "llama-3.3-70b-versatile"   # Clinical reasoning tier
FAST_MODEL = "llama-3.1-8b-instant"          # Triage / simple queries tier

# Approximate cost per 1K tokens (input+output blended estimate)
COST_PER_1K = {
    FAST_MODEL: 0.00005,
    COMPLEX_MODEL: 0.00059,
}


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate cost based on token counts."""
    total_tokens = prompt_tokens + completion_tokens
    return round((total_tokens / 1000) * COST_PER_1K.get(model, 0.001), 6)


def classify_complexity(last_user_message: str, patient_context: str = "") -> dict:
    """
    Cascade Router — Step 1: Use the fast model to classify whether the
    clinical input requires deep multi-system reasoning (HIGH) or is a
    straightforward query (LOW). Returns a dict with complexity, reason,
    and routing metadata for the audit log.
    """
    system_prompt = (
        "You are a clinical triage router. Your ONLY job is to classify whether "
        "a clinician's note requires complex multi-system reasoning or is simple.\n\n"
        "Respond with ONLY valid JSON in this exact format (no markdown, no explanation):\n"
        '{"complexity": "high" | "low", "reason": "<one concise sentence explaining why>"}\n\n'
        "Mark HIGH if the note involves: multiple overlapping symptoms, cross-visit pattern "
        "analysis, differential diagnosis territory, urgent/cardiac/neurological red flags, "
        "or drug interaction risks. Mark LOW for single simple observations, admin queries, "
        "or social history updates."
    )

    user_content = f"Patient context: {patient_context}\n\nClinician note: {last_user_message}"

    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        model=FAST_MODEL,
        temperature=0.0,
        max_tokens=80,
    )

    raw = completion.choices[0].message.content.strip()
    cost = _estimate_cost(
        FAST_MODEL,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens,
    )

    try:
        result = json.loads(raw)
        complexity = result.get("complexity", "low").lower()
        reason = result.get("reason", "Routine clinical input")
    except (json.JSONDecodeError, AttributeError):
        complexity = "low"
        reason = "Triage parser fallback — defaulting to low complexity"

    return {
        "complexity": complexity,
        "reason": reason,
        "model_used": FAST_MODEL,
        "cost_incurred": cost,
        "action": "Cascade Triage",
    }


def get_agent_response(messages: list, complexity: str = "low") -> dict:
    """
    Cascade Router — Step 2: Route to the appropriate model tier based on
    the complexity score from classify_complexity().
    """
    model = COMPLEX_MODEL if complexity == "high" else FAST_MODEL

    formatted_messages = [
        {
            "role": "system",
            "content": (
                "You are CareThread, an advanced clinical intelligence assistant. "
                "You are concise, professional, and clinically precise. "
                "Respond in 2-3 sentences. Do not offer greetings. "
                "When symptoms are complex or urgent, acknowledge the pattern directly."
            ),
        }
    ]

    for msg in messages:
        groq_role = "assistant" if msg.role == "agent" else "user"
        formatted_messages.append({"role": groq_role, "content": msg.content})

    completion = groq_client.chat.completions.create(
        messages=formatted_messages,
        model=model,
        temperature=0.2,
        max_tokens=200,
    )

    content = completion.choices[0].message.content
    cost = _estimate_cost(
        model,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens,
    )

    return {
        "content": content,
        "model_used": model,
        "cost_incurred": cost,
        "action": "Agent Response",
        "tier": "CLINICAL" if model == COMPLEX_MODEL else "FAST",
    }


def generate_differentials(messages: list, patient_history: list) -> dict:
    """
    Real LLM-powered differential diagnosis generation.
    Calls the 70B model with a structured JSON prompt and parses the response.
    Falls back gracefully if JSON parsing fails.
    """
    # Build a compact conversation summary for context
    convo_text = "\n".join(
        f"{'Clinician' if m.role == 'user' else 'AI'}: {m.content}"
        for m in messages[-6:]  # Last 6 turns for context window efficiency
    )

    history_text = "\n".join(
        f"Visit {v.get('visit_number', '?')} ({v.get('date', '?')}): {v.get('notes', '')}"
        for v in (patient_history or [])[-3:]  # Last 3 visits
    )

    system_prompt = (
        "You are a clinical decision support AI generating differential diagnoses. "
        "Analyze the conversation and patient history, then return ONLY a valid JSON array. "
        "No markdown fences, no explanation — just the raw JSON array.\n\n"
        "Each item in the array must have exactly these fields:\n"
        '  "condition": string (diagnosis name),\n'
        '  "confidence": integer 0-100 (clinical likelihood given the evidence),\n'
        '  "evidence": string (≤12 words citing specific symptoms or history),\n'
        '  "urgent": boolean (true only if needs immediate workup or escalation)\n\n'
        "Return 2-4 differentials ordered by confidence descending. "
        "Be medically accurate — base confidence on real epidemiology, not pattern matching."
    )

    user_content = (
        f"Patient history:\n{history_text}\n\n"
        f"Current session conversation:\n{convo_text}"
    )

    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        model=COMPLEX_MODEL,
        temperature=0.1,
        max_tokens=400,
    )

    raw = completion.choices[0].message.content.strip()
    cost = _estimate_cost(
        COMPLEX_MODEL,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens,
    )

    # Robust JSON parsing — strip any accidental markdown fences
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
        raw = raw.rstrip("`").strip()

    try:
        differentials = json.loads(raw)
        if not isinstance(differentials, list):
            raise ValueError("Expected a JSON array")
        # Validate and clamp fields
        validated = []
        for d in differentials[:4]:
            validated.append({
                "condition": str(d.get("condition", "Unknown")),
                "confidence": max(0, min(100, int(d.get("confidence", 50)))),
                "evidence": str(d.get("evidence", "")),
                "urgent": bool(d.get("urgent", False)),
            })
        differentials = validated
    except (json.JSONDecodeError, ValueError, TypeError):
        # Graceful fallback — still a real model response, just unparseable
        differentials = [{
            "condition": "Assessment Pending",
            "confidence": 50,
            "evidence": "LLM response could not be parsed as JSON",
            "urgent": False,
        }]

    return {
        "differentials": differentials,
        "model_used": COMPLEX_MODEL,
        "cost_incurred": cost,
        "action": "Differential Generation",
        "tier": "CLINICAL",
    }


def generate_soap_note(messages: list, patient: dict, history: list) -> dict:
    """
    Generates a structured SOAP note from the session conversation using the
    70B clinical reasoning model.
    """
    convo_text = "\n".join(
        f"{'Clinician' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
        for m in messages
        if m.get('role') in ('user', 'agent')
    )

    history_text = "\n".join(
        f"Visit {v.get('visit_number', '?')} ({v.get('date', '?')}): {v.get('notes', '')}"
        for v in (history or [])
    )

    system_prompt = (
        "You are a clinical documentation AI. Generate a SOAP note from the session data. "
        "Respond ONLY with valid JSON in this exact format (no markdown):\n"
        '{"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}\n\n'
        "subjective: Patient-reported symptoms and history in 2-3 sentences.\n"
        "objective: Relevant findings and vitals from context (or note if not provided).\n"
        "assessment: Clinical impression and top differential(s) in 1-2 sentences.\n"
        "plan: Recommended next steps, tests, or referrals in 2-3 bullet points as a single string."
    )

    user_content = (
        f"Patient: {patient.get('name', 'Unknown')}, DOB: {patient.get('dob', 'Unknown')}\n"
        f"Past visits:\n{history_text}\n\n"
        f"Session transcript:\n{convo_text}"
    )

    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        model=COMPLEX_MODEL,
        temperature=0.2,
        max_tokens=500,
    )

    raw = completion.choices[0].message.content.strip()
    cost = _estimate_cost(
        COMPLEX_MODEL,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens,
    )

    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
        raw = raw.rstrip("`").strip()

    try:
        soap = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        soap = {
            "subjective": raw,
            "objective": "Not captured in session.",
            "assessment": "See conversation transcript.",
            "plan": "Clinician review required.",
        }

    return {
        "soap": soap,
        "model_used": COMPLEX_MODEL,
        "cost_incurred": cost,
    }
