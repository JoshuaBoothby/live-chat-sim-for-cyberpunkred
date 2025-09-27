
import os
import json
import time
import asyncio
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Simple request tracking for throttling
request_tracker = {}
MAX_REQUESTS_PER_MINUTE = 10

def check_rate_limit(client_ip: str) -> bool:
    """Simple rate limiting: max 10 requests per minute per IP"""
    current_time = time.time()
    if client_ip not in request_tracker:
        request_tracker[client_ip] = []
    
    # Clean old requests (older than 1 minute)
    request_tracker[client_ip] = [
        req_time for req_time in request_tracker[client_ip] 
        if current_time - req_time < 60
    ]
    
    # Check if under limit
    if len(request_tracker[client_ip]) >= MAX_REQUESTS_PER_MINUTE:
        return False
    
    # Add current request
    request_tracker[client_ip].append(current_time)
    return True

# Load your lore database using absolute path
current_dir = os.path.dirname(__file__)
file_path = os.path.join(current_dir, "lore.json")
with open(file_path, "r") as f:
    lore_data = json.load(f)
lore_text = "\n".join([entry["text"] for entry in lore_data])

# Load Phi-3 Mini (8-bit)
model_name = "microsoft/phi-3-mini-4k-instruct"
print("⏳ Loading Phi-3 Mini (8-bit)...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="cuda",
    load_in_8bit=True
)
print("✅ Phi-3 Mini loaded.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple ping endpoint for testing
@app.get("/api/ping")
async def ping():
    return {"status": "ok"}

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    # Rate limiting check
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        print(f"[RATE_LIMIT] Too many requests from {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    
    try:
        # Debug: print incoming message
        print(f"[DEBUG] Received message: {req.message}")
        import random
        # Select fewer lore entries to reduce prompt size
        lore_snippets = random.sample(lore_data, min(3, len(lore_data)))  # Reduced from 6 to 3
        lore_context = "\n".join([entry["text"] for entry in lore_snippets])[:400]  # Limit context size

        # Generate 4 random chat personas
        persona_styles = [
            "geeky and excitable",
            "skeptical and brash",
            "sarcastic and stylish",
            "troll, chaotic, leetspeak",
            "edgy and mysterious",
            "optimistic and naive",
            "streetwise and cynical",
            "old-school and grumpy",
            "hacker and paranoid",
            "nomad and adventurous"
        ]
        personas = []
        for i in range(4):
            name = f"{random.choice(['Netrunner','Chrome','Glitter','Jock','Pixie','Rogue','Nomad','Techie','Fixer','Solo'])}{random.randint(10,99)}"
            style = random.choice(persona_styles)
            personas.append(f"{name} ({style})")

        # Example chat lines for style guidance
        sample_lines = "Netrunner42: Yo, SovOil's tankers are busted!\nChromeJock88: Preem scoop, choom!\nGlitterGrrl: SovOil's always up to nova trouble.\nPixie77: Gonk move by SovOil, eh?"

        # Simplified, shorter prompt for faster processing
        prompt = (
            f"Cyberpunk chat simulation for stream event: {req.message}\n"
            f"Personas: {', '.join(personas[:2])}.\n"  # Use only 2 personas to reduce complexity
            f"Context: {lore_context[:200]}...\n"  # Limit context further
            f"Generate 4 short chat reactions (1 line each, Cyberpunk slang):\n"
            f"Format: Username: reaction\n"
        )
        print(f"[DEBUG] Prompt: {prompt[:200]}...")
        inputs = tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        # Timeout wrapper
        async def run_with_timeout():
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: model.generate(
                    **inputs,
                    max_new_tokens=16,
                    do_sample=True,
                    temperature=0.8
                )
            )

        try:
            outputs = await asyncio.wait_for(run_with_timeout(), timeout=15)
        except asyncio.TimeoutError:
            print("[ERROR] AI timed out.")
            # Use fallback responses instead of error message
            fallback_responses = [
                "Netrunner42: Yo, that's nova!\nChromeJock88: Preem stuff, choom!\nGlitterGrrl: Always something in Night City...\nPixie77: 1337 content right there!",
                "Solo99: Street's talking about this.\nTechie55: Seen worse in Watson.\nFixer33: Corps always up to something.\nNomad22: Time to hit the road, chooms.",
                "Chrome88: That's some serious biz.\nRogue44: Night City never sleeps.\nNetrunner13: Data looks sketchy...\nJock77: Nova times ahead!"
            ]
            import random
            return {"response": random.choice(fallback_responses)}

        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove the prompt echo
        response = response.replace(prompt, "").strip()
        # Filter out lines that start with 'User:' or echo the prompt
        lines = [line.strip() for line in response.split("\n") if line.strip() and not line.strip().startswith("User:") and not line.strip().startswith("Garygur:")]
        filtered_response = "\n".join(lines)
        print(f"[DEBUG] AI response: {filtered_response}")
        return {"response": filtered_response}
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        # Use fallback responses instead of error messages
        fallback_responses = [
            "Netrunner42: Yo, that's nova!\nChromeJock88: Preem stuff, choom!\nGlitterGrrl: Always something in Night City...\nPixie77: 1337 content right there!",
            "Solo99: Street's talking about this.\nTechie55: Seen worse in Watson.\nFixer33: Corps always up to something.\nNomad22: Time to hit the road, chooms.",
            "Chrome88: That's some serious biz.\nRogue44: Night City never sleeps.\nNetrunner13: Data looks sketchy...\nJock77: Nova times ahead!"
        ]
        import random
        return {"response": random.choice(fallback_responses)}

# To run: uvicorn chatbot:app --host 0.0.0.0 --port 5000 --reload
