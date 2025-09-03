// Node.js Live Chat Simulator for Cyberpunk RED
// Simulates multiple chat personas, calls local LLM backend, prints scrolling chat

const axios = require("axios");

// --- Persona Definitions ---
const personas = [
  {
    username: "NetrunnerFan42",
    style: "geeky and excitable",
    quirks: "Loves netrunning, uses lots of slang, always positive.",
  },
  {
    username: "ChromedJock88",
    style: "skeptical and brash",
    quirks: "Always doubts what he sees, uses sports metaphors.",
  },
  {
    username: "GlitterGrrl",
    style: "sarcastic and stylish",
    quirks: "Loves fashion, throws shade, uses lots of emojis.",
  },
  {
    username: "ChromePixie",
    style: "troll, chaotic, leetspeak",
    quirks: "Types in leetspeak, loves to stir up drama, never serious.",
  },
];

// --- Persona Prompt Builder ---
function personaPrompt(username, style) {
  return `You are ${username}, a random chatter in RazorJade's live stream in Night City.\nSpeak in short, slangy bursts. Stay in Cyberpunk Red vibe (${style}).\nNever write more than 1–2 lines.`;
}

// --- LLM Call ---
async function getLLMResponse(prompt) {
  // Adjust this endpoint/format for your local LLM server
  // Example: LM Studio, Ollama, or custom Flask/FastAPI server
  try {
    const res = await axios.post("http://localhost:5001/generate", {
      prompt,
      max_tokens: 48,
      temperature: 0.9,
    });
    // Adjust this if your LLM returns a different field
    return (
      res.data.text ||
      res.data.response ||
      res.data.choices?.[0]?.text ||
      "[No response]"
    );
  } catch (e) {
    return "[LLM error: " + e.message + "]";
  }
}

// --- Chat Simulation ---
const streamEvents = [
  "Max Hammer just showed a borg fight",
  "The Edgerunner crew is about to raid a Maelstrom den",
  "A new braindance leak is trending",
  "Rumors about Arasaka in Watson",
  "A Nomad convoy just rolled through the Badlands",
];

async function runChatSim() {
  console.log("--- Cyberpunk RED Live Chat Simulator ---\n");
  for (let i = 0; i < 20; i++) {
    // 20 chat lines
    // Pick a random persona and event
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const event = streamEvents[Math.floor(Math.random() * streamEvents.length)];
    // Compose the prompt as described
    const finalPrompt =
      personaPrompt(persona.username, persona.style) +
      `\nStream Event: ${event}\nChat response:`;
    process.stdout.write(`\x1b[90m[${persona.username}]\x1b[0m `); // gray name
    const reply = await getLLMResponse(finalPrompt);
    console.log(reply.trim());
    // Wait 1-2 seconds before next message
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
  }
  console.log("\n--- End of Simulated Chat ---");
}

runChatSim();
