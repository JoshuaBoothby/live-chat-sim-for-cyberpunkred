const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load lore data once at startup
const loreData = JSON.parse(fs.readFileSync(path.join(__dirname, "lore.json"), "utf8"));

// Configuration
const LLM_API_URL = process.env.LLM_API_URL || "http://localhost:11434/api/chat";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";
const PORT = process.env.PORT || 5000;

// Cache for responses and personas
const responseCache = new Map();
const personaCache = new Map();
const MAX_CACHE_SIZE = 100;

// Pre-defined efficient persona templates
const PERSONA_TEMPLATES = [
  { namePrefix: "Netrunner", style: "geeky and excitable" },
  { namePrefix: "Chrome", style: "skeptical and brash" },
  { namePrefix: "Glitter", style: "sarcastic and stylish" },
  { namePrefix: "Pixie", style: "troll, chaotic, leetspeak" },
  { namePrefix: "Rogue", style: "edgy and mysterious" },
  { namePrefix: "Jock", style: "optimistic and naive" },
  { namePrefix: "Solo", style: "streetwise and cynical" },
  { namePrefix: "Techie", style: "old-school and grumpy" },
  { namePrefix: "Fixer", style: "hacker and paranoid" },
  { namePrefix: "Nomad", style: "nomad and adventurous" }
];

// Fallback responses when LLM is unavailable
const FALLBACK_RESPONSES = [
  "Netrunner42: Yo, that's nova!\nChromeJock88: Preem stuff, choom!\nGlitterGrrl: Always something in Night City...\nPixie77: 1337 content right there!",
  "Solo99: Street's talking about this.\nTechie55: Seen worse in Watson.\nFixer33: Corps always up to something.\nNomad22: Time to hit the road, chooms.",
  "Chrome88: That's some serious biz.\nRogue44: Night City never sleeps.\nNetrunner13: Data looks sketchy...\nJock77: Nova times ahead!"
];

// Efficient lore retrieval with simple keyword matching
function getRelevantLore(message, numSnippets = 3) {
  const cacheKey = `lore_${message.toLowerCase().slice(0, 50)}`;
  
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  const keywords = message.toLowerCase().split(/\s+/);
  const scoredLore = [];

  for (const entry of loreData) {
    let score = 0;
    const textLower = entry.text.toLowerCase();
    
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > 0) {
      scoredLore.push({ score, entry });
    }
  }

  // Sort by relevance and take top entries
  scoredLore.sort((a, b) => b.score - a.score);
  let selected = scoredLore.slice(0, numSnippets).map(item => item.entry);

  // If no relevant lore found, use random selection
  if (selected.length === 0) {
    const shuffled = [...loreData].sort(() => 0.5 - Math.random());
    selected = shuffled.slice(0, numSnippets);
  }

  const result = selected.map(entry => entry.text).join("\n");
  
  // Cache the result
  if (responseCache.size < MAX_CACHE_SIZE) {
    responseCache.set(cacheKey, result);
  }
  
  return result;
}

// Generate personas with caching
function generatePersonas(messageSeed) {
  const cacheKey = `personas_${messageSeed.slice(0, 20)}`;
  
  if (personaCache.has(cacheKey)) {
    return personaCache.get(cacheKey);
  }

  // Use message as seed for deterministic randomness
  const seedValue = messageSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...PERSONA_TEMPLATES].sort(() => (seedValue % 100) / 100 - 0.5);
  
  const personas = shuffled.slice(0, 4).map(template => {
    const num = (seedValue + template.namePrefix.length) % 90 + 10;
    return `${template.namePrefix}${num} (${template.style})`;
  });

  // Cache the result
  if (personaCache.size < MAX_CACHE_SIZE) {
    personaCache.set(cacheKey, personas);
  }

  return personas;
}

// Create optimized prompt
function createOptimizedPrompt(message, personas, loreContext) {
  const sampleChat = "Netrunner42: Yo, that's nova!\nChrome88: Preem stuff, choom!\nPixie77: 1337 content!";
  
  return `You are simulating live chat for a Cyberpunk Red stream.

Lore context: ${loreContext.slice(0, 300)}...

Chat personas: ${personas.join(", ")}

Stream event: ${message}

Generate 4 short authentic chat reactions (1-2 lines each, use Cyberpunk slang):

Example format:
${sampleChat}

Response:`;
}

// Call LLM API with timeout and error handling
async function callLLMAPI(prompt) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await axios.post(LLM_API_URL, {
      model: LLM_MODEL,
      messages: [
        { role: "system", content: "You are a Cyberpunk Red chat simulator. Be concise and authentic." },
        { role: "user", content: prompt }
      ],
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 150
      }
    }, {
      signal: controller.signal,
      timeout: 15000
    });

    clearTimeout(timeoutId);
    
    if (response.data && response.data.message && response.data.message.content) {
      return response.data.message.content;
    }
    
    return "";
  } catch (error) {
    console.error("[ERROR] LLM API call failed:", error.message);
    return "";
  }
}

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  const { message, history } = req.body;
  
  try {
    console.log(`[DEBUG] Received message: ${message}`);
    
    // Create cache key
    const cacheKey = `chat_${message}_${history.length}`;
    
    // Check response cache first
    if (responseCache.has(cacheKey)) {
      console.log(`[CACHE] Using cached response for: ${message.slice(0, 50)}...`);
      return res.json({ response: responseCache.get(cacheKey) });
    }
    
    // Get relevant lore (with caching)
    const loreContext = getRelevantLore(message, 3);
    
    // Generate personas (with caching)
    const personas = generatePersonas(message);
    
    // Create optimized prompt
    const prompt = createOptimizedPrompt(message, personas, loreContext);
    console.log(`[DEBUG] Prompt length: ${prompt.length} chars`);
    
    // Call LLM API
    let response = await callLLMAPI(prompt);
    
    // Fallback if LLM fails
    if (!response || response.trim().length < 10) {
      console.log("[FALLBACK] Using fallback response");
      response = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    }
    
    // Clean up response
    const lines = [];
    for (let line of response.split('\n')) {
      line = line.trim();
      if (line && !line.startsWith('User:') && !line.startsWith('Assistant:') && !line.startsWith('Response:')) {
        // Ensure line has username format
        if (!line.includes(':') && line.length < 50) {
          // Add a random username if missing
          const username = personas[Math.floor(Math.random() * personas.length)].split('(')[0].trim();
          line = `${username}: ${line}`;
        }
        lines.push(line);
      }
    }
    
    const filteredResponse = lines.slice(0, 4).join('\n'); // Limit to 4 lines
    
    // Cache the response
    if (responseCache.size < MAX_CACHE_SIZE) {
      responseCache.set(cacheKey, filteredResponse);
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`[DEBUG] Response generated in ${elapsed}ms`);
    console.log(`[DEBUG] Response: ${filteredResponse.slice(0, 100)}...`);
    
    res.json({ response: filteredResponse });
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    res.json({ response: fallback });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    cache_stats: {
      response_cache_size: responseCache.size,
      persona_cache_size: personaCache.size
    },
    uptime: process.uptime()
  });
});

// Ping endpoint
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Clear cache endpoint (for maintenance)
app.post("/api/cache/clear", (req, res) => {
  responseCache.clear();
  personaCache.clear();
  res.json({ status: "Cache cleared", timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Optimized Cyberpunk RED backend running on http://localhost:${PORT}`);
  console.log(`📡 LLM API: ${LLM_API_URL}`);
  console.log(`🤖 Model: ${LLM_MODEL}`);
  console.log(`📚 Loaded ${loreData.length} lore entries`);
});