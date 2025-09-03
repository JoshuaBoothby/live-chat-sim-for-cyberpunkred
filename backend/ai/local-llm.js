const axios = require("axios");

// System prompt for Cyberpunk Red NPC
const systemPrompt = `
You are an NPC in the Cyberpunk Red universe.
Speak in a gritty, sarcastic, streetwise tone.
Use slang like 'choom', 'gonk', 'preem', and 'nova'.
Stay in Night City lore and NEVER break character.
`;

async function getLocalLLMResponse(message, history = []) {
  const prompt = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  // Example: POST to Ollama's local API
  const res = await axios.post("http://localhost:11434/api/chat", {
    model: "llama3", // or your preferred local model
    messages: prompt,
  });

  return res.data.message.content;
}

module.exports = { getLocalLLMResponse };
