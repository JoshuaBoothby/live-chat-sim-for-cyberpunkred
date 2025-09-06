
import os
import json
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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
async def chat_endpoint(req: ChatRequest):
    import asyncio
    try:
        # Debug: print incoming message
        print(f"[DEBUG] Received message: {req.message}")
        import random
        # Select 4-6 random lore entries for richer context
        lore_snippets = random.sample(lore_data, min(6, len(lore_data)))
        lore_context = "\n".join([entry["text"] for entry in lore_snippets])

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

        prompt = (
            f"Night City Lore Context:\n{lore_context}\n\n"
            f"You are simulating a live chat for a Cyberpunk Red Media Edgerunner stream.\n"
            f"Chat personalities: {', '.join(personas)}.\n"
            f"Speak in short, slangy bursts. Use Cyberpunk slang. Never write more than 1–2 lines.\n"
            f"Do NOT drop lore as a block or info dump. Instead, let chatters react naturally, referencing lore only as real chatters would.\n"
            f"Sample chat:\n{sample_lines}\n"
            f"Stream Event: {req.message}\n"
            f"Now generate 4 authentic chat messages reacting to the stream.\n"
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
                    max_new_tokens=60,
                    do_sample=True,
                    temperature=0.8
                )
            )

        try:
            outputs = await asyncio.wait_for(run_with_timeout(), timeout=30)
        except asyncio.TimeoutError:
            print("[ERROR] AI timed out.")
            return {"response": "[AI timed out, please try again or simplify your prompt.]"}

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
        return {"response": f"[AI error: {str(e)}]"}

# To run: uvicorn chatbot:app --host 0.0.0.0 --port 5000 --reload
