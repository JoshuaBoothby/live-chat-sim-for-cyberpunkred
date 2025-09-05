import json
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Load your lore database
with open("lore.json", "r") as f:
    lore_data = json.load(f)
lore_text = "\n".join([entry["text"] for entry in lore_data])

# Load Phi-3 Mini (8-bit)
model_name = "microsoft/phi-3-mini-4k-instruct"
print("⏳ Loading Phi-3 Mini (8-bit)...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto"
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

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # Combine user input with lore for context
    prompt = f"{lore_text}\n\nUser: {req.message}\nAI:"
    inputs = tokenizer(prompt, return_tensors="pt")
    # Run model.generate in a thread to avoid blocking the event loop
    import asyncio
    loop = asyncio.get_event_loop()
    outputs = await loop.run_in_executor(
        None,
        lambda: model.generate(
            **inputs,
            max_new_tokens=50,
            do_sample=True,
            temperature=0.7
        )
    )
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Remove the prompt echo
    response = response.replace(prompt, "").strip()
    return {"response": response}

# To run: uvicorn chatbot:app --host 0.0.0.0 --port 5000 --reload
