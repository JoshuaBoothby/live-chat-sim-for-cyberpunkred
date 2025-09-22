const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load lore data
const loreData = JSON.parse(fs.readFileSync(path.join(__dirname, "lore.json"), "utf8"));

// Cyberpunk slang and phrases
const CYBERPUNK_SLANG = {
  positive: ["nova", "preem", "ace", "solid", "chrome"],
  negative: ["gonk", "scop", "flatline", "zero", "slag"],
  general: ["choom", "edgerunner", "corpo", "netrunner", "solo"]
};

const REACTION_TEMPLATES = {
  excitement: [
    "Yo, that's {positive}!",
    "Holy {positive}, choom!",
    "{positive} stuff right there!",
    "That's some {positive} biz!"
  ],
  skeptical: [
    "Sounds like {negative} talk to me.",
    "Sure, {general}...",
    "Another corpo lie?",
    "I've seen this before..."
  ],
  casual: [
    "Typical Night City.",
    "Just another day in the Combat Zone.",
    "Corps gonna corp.",
    "Street's always talking."
  ],
  sarcastic: [
    "Oh {positive}, another miracle...",
    "Real {positive}, {general}.",
    "Because that always works out...",
    "Sure it does, {general}."
  ]
};

const USERNAMES = [
  "Netrunner42", "ChromeJock88", "GlitterGrrl", "PixieHacker",
  "SoloStrike", "TechieWiz", "FixerPro", "NomadRider",
  "RogueAgent", "CyberSamurai", "DataJockey", "StreetDoc"
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function fillTemplate(template, slangCategories) {
  return template.replace(/\{(\w+)\}/g, (match, category) => {
    if (slangCategories[category]) {
      return getRandomElement(slangCategories[category]);
    }
    return match;
  });
}

function generateContextualResponse(message) {
  const messageLower = message.toLowerCase();
  const responses = [];
  
  // Analyze message sentiment and content
  const isPositive = /good|great|awesome|nova|preem|win|success/.test(messageLower);
  const isNegative = /bad|terrible|awful|gonk|fail|wrong|problem/.test(messageLower);
  const isCorporate = /corpo|arasaka|militech|sov|oil|corporation/.test(messageLower);
  const isAction = /fight|raid|run|hack|job|gig|mission/.test(messageLower);
  
  // Generate 4 different response styles
  const styles = ['excitement', 'skeptical', 'casual', 'sarcastic'];
  
  for (let i = 0; i < 4; i++) {
    let style = styles[i];
    let templates = REACTION_TEMPLATES[style];
    
    // Adjust style based on message content
    if (isPositive && style === 'skeptical') {
      style = 'excitement';
      templates = REACTION_TEMPLATES[style];
    } else if (isNegative && style === 'excitement') {
      style = 'skeptical';
      templates = REACTION_TEMPLATES[style];
    }
    
    const template = getRandomElement(templates);
    const response = fillTemplate(template, CYBERPUNK_SLANG);
    const username = getRandomElement(USERNAMES);
    
    responses.push(`${username}: ${response}`);
  }
  
  return responses.join('\n');
}

function generateLoreBasedResponse(message) {
  const messageLower = message.toLowerCase();
  const relevantLore = loreData.filter(entry => {
    const keywords = messageLower.split(/\s+/);
    return keywords.some(keyword => 
      entry.text.toLowerCase().includes(keyword) && keyword.length > 2
    );
  });
  
  if (relevantLore.length === 0) {
    return generateContextualResponse(message);
  }
  
  // Use relevant lore to create more informed responses
  const responses = [];
  const usedUsernames = new Set();
  
  for (let i = 0; i < 4; i++) {
    let username;
    do {
      username = getRandomElement(USERNAMES);
    } while (usedUsernames.has(username) && usedUsernames.size < USERNAMES.length);
    usedUsernames.add(username);
    
    const loreEntry = getRandomElement(relevantLore);
    const loreWords = loreEntry.text.toLowerCase().split(/\s+/);
    const contextWord = loreWords.find(word => 
      messageLower.includes(word) && word.length > 3
    );
    
    let response;
    if (contextWord) {
      const slangWord = getRandomElement([...CYBERPUNK_SLANG.positive, ...CYBERPUNK_SLANG.general]);
      response = `Yeah, ${contextWord} is ${slangWord} stuff, choom.`;
    } else {
      response = generateContextualResponse(message).split('\n')[0].split(': ')[1];
    }
    
    responses.push(`${username}: ${response}`);
  }
  
  return responses.join('\n');
}

// Main chat endpoint
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  
  try {
    console.log(`[DEBUG] Received message: ${message}`);
    
    const response = Math.random() > 0.5 ? 
      generateLoreBasedResponse(message) : 
      generateContextualResponse(message);
    
    console.log(`[DEBUG] Generated response: ${response}`);
    
    res.json({ response });
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    res.json({ 
      response: "Netrunner42: Connection's a bit glitchy, choom!\nChromeJock88: Try again in a sec.\nGlitterGrrl: Night City tech, what do you expect?\nPixieHacker: 404 response not found lol"
    });
  }
});

// Health and ping endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "standalone",
    lore_entries: loreData.length,
    uptime: process.uptime()
  });
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Standalone Cyberpunk RED backend running on http://localhost:${PORT}`);
  console.log(`📚 Loaded ${loreData.length} lore entries`);
  console.log(`🤖 Using built-in response generation (no external LLM required)`);
});