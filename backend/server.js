const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { getLocalLLMResponse } = require("./ai/local-llm");
const { ChromaClient } = require("chromadb");
const { pipeline } = require("@xenova/transformers");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Helper to get relevant lore from ChromaDB
async function getRelevantLore(query, n_results = 2) {
  const chroma = new ChromaClient({
    host: "localhost",
    port: 8001,
    ssl: false,
  });
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  const embedding = await embedder(query);
  const collection = await chroma.getCollection({ name: "cyberpunk_lore" });
  const results = await collection.query({
    query_embeddings: [embedding[0][0]],
    n_results,
  });
  return results.documents.flat();
}

app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  // Retrieve relevant lore
  let loreSnippets = [];
  try {
    loreSnippets = await getRelevantLore(message, 2);
  } catch (e) {
    console.error("Lore retrieval error:", e);
  }
  const loreText = loreSnippets.join("\n");
  const prompt = `
You are simulating a live chat for a Cyberpunk Red Media Edgerunner stream.
Here is relevant Night City lore you can use for context:
${loreText}

Now generate 5 short live chat messages reacting to the stream.
Make sure they feel authentic to Cyberpunk slang and culture.
`;
  const response = await getLocalLLMResponse(prompt, history);
  res.json({ response });
});

app.listen(5000, () => console.log("Backend running on http://localhost:5000"));
