import os
import json
from groq import Groq
from dotenv import load_dotenv

# Import real dependencies
import cascadeflow
from hindsight_client import Hindsight

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is missing")

groq_client = Groq(api_key=GROQ_API_KEY)

# Initialize cascadeflow observe mode
try:
    cascadeflow.init(mode="observe")
except Exception as e:
    print(f"Warning: Failed to initialize cascadeflow: {e}")

# Initialize hindsight client (with local fallback/silent logging if server isn't up)
try:
    hindsight_client = Hindsight(base_url=os.getenv("HINDSIGHT_API_URL", "http://localhost:8080"))
except Exception as e:
    print(f"Warning: Failed to initialize hindsight-client (will fallback to local): {e}")
    hindsight_client = None

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

    # Use cascadeflow context block to measure performance & enforce routing guidelines
    with cascadeflow.run(budget=0.01) as session:
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

    # Log step to Hindsight client memory retrospectively if initialized
    if hindsight_client:
        try:
            hindsight_client.retain(
                bank_id="clinical_triage",
                content=f"Clinical note triage classification. Note: {last_user_message}. Determined complexity: {complexity}. Reason: {reason}"
            )
        except Exception:
            pass

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

    # Wrap the selected execution path in cascadeflow
    with cascadeflow.run(budget=0.05) as session:
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

    # Add transaction trace to Hindsight memory
    if hindsight_client and messages:
        try:
            hindsight_client.retain(
                bank_id="agent_responses",
                content=f"Interaction response from {model}. Output: {content}"
            )
        except Exception:
            pass

    return {
        "content": content,
        "model_used": model,
        "cost_incurred": cost,
        "action": "Agent Response",
        "tier": "CLINICAL" if model == COMPLEX_MODEL else "FAST",
    }


def generate_differentials(messages: list, patient_history: list) -> dict:
    """
    Real LLM-powered differential diagnosis generation with a virtual multi-agent consensus debate.
    Calls the 70B model with a structured JSON prompt and parses the response.
    Falls back gracefully if JSON parsing fails.
    """
    # Build a compact conversation summary for context
    convo_text = "\n".join(
        f"{'Clinician' if getattr(m, 'role', '') == 'user' else 'AI'}: {getattr(m, 'content', '')}"
        for m in messages[-6:]  # Last 6 turns for context window efficiency
    )

    history_text = "\n".join(
        f"Visit {v.get('visit_number', '?')} ({v.get('date', '?')}): {v.get('notes', '')}"
        for v in (patient_history or [])[-3:]  # Last 3 visits
    )

    system_prompt = (
        "You are a clinical decision support AI running a virtual consensus debate between three medical experts:\n"
        "1. Dr. Sarah Lin (General Practitioner) - Analyzes primary symptoms and patient history.\n"
        "2. Dr. Marcus Vance (Specialist) - Offers a deep-dive specialist perspective (Cardiology, Neurology, etc. based on symptoms).\n"
        "3. Dr. Helen Vance (Chief Medical Officer) - Moderates and drives final consensus.\n\n"
        "Analyze the conversation and patient history. You must return ONLY a valid JSON object. "
        "No markdown fences, no explanation — just raw JSON. The format MUST be exactly:\n"
        "{\n"
        '  "debate_logs": [\n'
        '    {"agent": "Dr. Sarah Lin (General Practitioner)", "message": "GP perspective on the symptoms and history in 1-2 sentences."},\n'
        '    {"agent": "Dr. Marcus Vance (Specialist)", "message": "Specialist perspective based on the clinical details in 1-2 sentences."},\n'
        '    {"agent": "Dr. Helen Vance (Chief Medical Officer)", "message": "Summary of debate and consensus call in 1-2 sentences."}\n'
        '  ],\n'
        '  "differentials": [\n'
        '    {"condition": "diagnosis name", "confidence": 85, "evidence": "symptom/history support <= 12 words", "urgent": true/false}\n'
        '  ]\n'
        "}\n\n"
        "Return 2-4 differentials in the differentials array. Be clinically precise."
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
        max_tokens=600,
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

    debate_logs = []
    differentials = []

    try:
        data = json.loads(raw)
        debate_logs = data.get("debate_logs", [])
        raw_diffs = data.get("differentials", [])
        
        if not isinstance(raw_diffs, list):
            raise ValueError("Expected a differentials JSON array")
        
        # Validate and clamp fields
        for d in raw_diffs[:4]:
            differentials.append({
                "condition": str(d.get("condition", "Unknown")),
                "confidence": max(0, min(100, int(d.get("confidence", 50)))),
                "evidence": str(d.get("evidence", "")),
                "urgent": bool(d.get("urgent", False)),
            })
    except (json.JSONDecodeError, ValueError, TypeError):
        # Graceful fallback — still a real model response, just unparseable
        differentials = [{
            "condition": "Assessment Pending",
            "confidence": 50,
            "evidence": "LLM response could not be parsed as JSON",
            "urgent": False,
        }]
        debate_logs = [
            {"agent": "Dr. Sarah Lin (General Practitioner)", "message": "We need to gather more structured inputs."},
            {"agent": "Dr. Marcus Vance (Specialist)", "message": "Agreed, clinical data format issue encountered."},
            {"agent": "Dr. Helen Vance (Chief Medical Officer)", "message": "Proceeding with standard monitoring protocol."}
        ]

    return {
        "differentials": differentials,
        "debate_logs": debate_logs,
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
