#!/usr/bin/env python3
"""
Optimized chatbot for Cyberpunk RED Live Chat Simulator
- Lightweight implementation without heavy ML dependencies
- Uses external LLM API (Ollama/OpenAI compatible)
- Implements caching and fallback mechanisms
- Optimized prompt engineering
"""

import os
import json
import asyncio
import aiohttp
import random
import time
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from functools import lru_cache

# Simple request tracking for throttling
request_tracker = {}
MAX_REQUESTS_PER_MINUTE = 15  # Slightly higher for optimized version

def check_rate_limit(client_ip: str) -> bool:
    """Simple rate limiting: max 15 requests per minute per IP"""
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

# Load lore database
current_dir = os.path.dirname(__file__)
file_path = os.path.join(current_dir, "lore.json")
with open(file_path, "r") as f:
    lore_data = json.load(f)

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

# Configuration
LLM_API_URL = os.getenv("LLM_API_URL", "http://localhost:11434/api/chat")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3")

# Caching for personas and lore snippets
PERSONA_CACHE = {}
LORE_CACHE = {}
RESPONSE_CACHE = {}
MAX_CACHE_SIZE = 100

# Pre-defined persona templates for efficiency
PERSONA_TEMPLATES = [
    {"name_prefix": "Netrunner", "style": "geeky and excitable"},
    {"name_prefix": "Chrome", "style": "skeptical and brash"},
    {"name_prefix": "Glitter", "style": "sarcastic and stylish"},
    {"name_prefix": "Pixie", "style": "troll, chaotic, leetspeak"},
    {"name_prefix": "Rogue", "style": "edgy and mysterious"},
    {"name_prefix": "Jock", "style": "optimistic and naive"},
    {"name_prefix": "Solo", "style": "streetwise and cynical"},
    {"name_prefix": "Techie", "style": "old-school and grumpy"},
    {"name_prefix": "Fixer", "style": "hacker and paranoid"},
    {"name_prefix": "Nomad", "style": "nomad and adventurous"}
]

# Fallback responses for when LLM is unavailable
FALLBACK_RESPONSES = [
    "Netrunner42: Yo, that's nova!\nChromeJock88: Preem stuff, choom!\nGlitterGrrl: Always something in Night City...\nPixie77: 1337 content right there!",
    "Solo99: Street's talking about this.\nTechie55: Seen worse in Watson.\nFixer33: Corps always up to something.\nNomad22: Time to hit the road, chooms.",
    "Chrome88: That's some serious biz.\nRogue44: Night City never sleeps.\nNetrunner13: Data looks sketchy...\nJock77: Nova times ahead!",
]

@lru_cache(maxsize=50)
def get_relevant_lore_cached(message_hash: str, num_snippets: int = 3) -> str:
    """Get relevant lore snippets with caching"""
    # Simple keyword-based relevance (more efficient than embeddings)
    keywords = message_hash.lower().split()
    scored_lore = []
    
    for entry in lore_data:
        score = 0
        text_lower = entry["text"].lower()
        for keyword in keywords:
            if keyword in text_lower:
                score += 1
        if score > 0:
            scored_lore.append((score, entry))
    
    # Sort by relevance and take top entries
    scored_lore.sort(key=lambda x: x[0], reverse=True)
    selected = [entry[1] for entry in scored_lore[:num_snippets]]
    
    # If no relevant lore found, use random selection
    if not selected:
        selected = random.sample(lore_data, min(num_snippets, len(lore_data)))
    
    return "\n".join([entry["text"] for entry in selected])

@lru_cache(maxsize=20)
def generate_personas_cached(seed: str) -> List[str]:
    """Generate personas with caching to avoid regeneration"""
    random.seed(hash(seed) % 1000)  # Deterministic based on seed
    personas = []
    templates = random.sample(PERSONA_TEMPLATES, 4)
    
    for template in templates:
        name = f"{template['name_prefix']}{random.randint(10,99)}"
        personas.append(f"{name} ({template['style']})")
    
    return personas

def create_optimized_prompt(message: str, personas: List[str], lore_context: str) -> str:
    """Create a more concise, efficient prompt"""
    sample_chat = "Netrunner42: Yo, that's nova!\nChrome88: Preem stuff, choom!\nPixie77: 1337 content!"
    
    prompt = f"""You are simulating live chat for a Cyberpunk Red stream.

Lore context: {lore_context[:300]}...

Chat personas: {', '.join(personas)}

Stream event: {message}

Generate 4 short authentic chat reactions (1-2 lines each, use Cyberpunk slang):

Example format:
{sample_chat}

Response:"""
    
    return prompt

async def call_llm_api(prompt: str) -> str:
    """Call external LLM API with timeout and error handling"""
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:  # Reduced from 15 to 10
            payload = {
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a Cyberpunk Red chat simulator. Be concise and authentic."},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "num_predict": 80  # Reduced from 150 to 80 for faster response
                }
            }
            
            async with session.post(LLM_API_URL, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("message", {}).get("content", "")
                else:
                    print(f"[ERROR] LLM API returned status {response.status}")
                    return ""
    except Exception as e:
        print(f"[ERROR] LLM API call failed: {e}")
        return ""

@app.get("/api/ping")
async def ping():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    # Rate limiting check
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        print(f"[RATE_LIMIT] Too many requests from {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
        
    try:
        start_time = time.time()
        print(f"[DEBUG] Received message: {req.message}")
        
        # Create cache keys
        message_hash = str(hash(req.message))
        cache_key = f"{message_hash}_{len(req.history)}"
        
        # Check response cache first
        if cache_key in RESPONSE_CACHE:
            print(f"[CACHE] Using cached response for: {req.message[:50]}...")
            return {"response": RESPONSE_CACHE[cache_key]}
        
        # Get relevant lore (cached)
        lore_context = get_relevant_lore_cached(message_hash, 3)
        
        # Generate personas (cached)
        personas = generate_personas_cached(req.message[:20])
        
        # Create optimized prompt
        prompt = create_optimized_prompt(req.message, personas, lore_context)
        print(f"[DEBUG] Prompt length: {len(prompt)} chars")
        
        # Call LLM API
        response = await call_llm_api(prompt)
        
        # Fallback if LLM fails
        if not response or len(response.strip()) < 10:
            print("[FALLBACK] Using fallback response")
            response = random.choice(FALLBACK_RESPONSES)
        
        # Clean up response
        lines = []
        for line in response.split('\n'):
            line = line.strip()
            if line and not line.startswith(('User:', 'Assistant:', 'Response:')):
                # Ensure line has username format
                if ':' not in line and len(line) < 50:
                    # Add a random username if missing
                    username = random.choice([p.split('(')[0].strip() for p in personas])
                    line = f"{username}: {line}"
                lines.append(line)
        
        filtered_response = '\n'.join(lines[:4])  # Limit to 4 lines
        
        # Cache the response
        if len(RESPONSE_CACHE) < MAX_CACHE_SIZE:
            RESPONSE_CACHE[cache_key] = filtered_response
        
        elapsed = time.time() - start_time
        print(f"[DEBUG] Response generated in {elapsed:.2f}s")
        print(f"[DEBUG] Response: {filtered_response[:100]}...")
        
        return {"response": filtered_response}
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        fallback = random.choice(FALLBACK_RESPONSES)
        return {"response": fallback}

# Health check endpoint
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "cache_stats": {
            "response_cache_size": len(RESPONSE_CACHE),
            "lore_cache_size": get_relevant_lore_cached.cache_info().currsize,
            "persona_cache_size": generate_personas_cached.cache_info().currsize
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting optimized Cyberpunk RED chatbot...")
    print(f"📡 LLM API: {LLM_API_URL}")
    print(f"🤖 Model: {LLM_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=5000)