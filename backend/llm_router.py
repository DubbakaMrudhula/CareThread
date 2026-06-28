import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is missing")

groq_client = Groq(api_key=GROQ_API_KEY)

# Use larger model for complex reasoning (differentials) and smaller for chat
COMPLEX_MODEL = "llama-3.3-70b-versatile"
FAST_MODEL = "llama-3.1-8b-instant"

def get_agent_response(messages, complexity="low"):
    """
    Simulates the cascadeflow router selecting the right Groq model based on complexity.
    """
    model = FAST_MODEL if complexity == "low" else COMPLEX_MODEL
    
    # Format messages for Groq API
    # Groq only accepts roles: "system", "user", "assistant"
    formatted_messages = [
        {"role": "system", "content": "You are CareThread, a highly advanced clinical intelligence agent. You are brief, concise, and professional. You respond in 1-2 sentences only and do not offer greetings."}
    ]
    
    for msg in messages:
        # Map internal "agent" role to "assistant" for the Groq API
        groq_role = "assistant" if msg.role == "agent" else "user"
        formatted_messages.append({"role": groq_role, "content": msg.content})

    completion = groq_client.chat.completions.create(
        messages=formatted_messages,
        model=model,
        temperature=0.2,
        max_tokens=150,
    )

    content = completion.choices[0].message.content
    
    # Calculate mock cost based on model (for the admin UI ticker)
    cost = 0.001 if model == FAST_MODEL else 0.004
    
    return {
        "content": content,
        "model_used": model,
        "cost_incurred": cost
    }
