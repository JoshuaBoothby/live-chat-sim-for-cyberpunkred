const { ChromaClient } = require("chromadb");
const { pipeline } = require("@xenova/transformers");
const fs = require("fs");

// ...existing code...
// This script ingests lore into ChromaDB 0.4.x via HTTP API
// Usage: node lore_ingest.js <lore_file.txt>

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const COLLECTION_NAME = "cyberpunk_lore";

async function createCollection() {
  try {
    await axios.post(`${CHROMA_URL}/api/v1/collections`, {
      name: COLLECTION_NAME,
      metadata: { description: "Cyberpunk RED lore" },
    });
    console.log("Collection created or already exists.");
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log("Collection already exists.");
    } else {
      console.error("Error creating collection:", err.message);
      process.exit(1);
    }
  }
}

async function addDocuments(docs) {
  try {
    // ChromaDB 0.4.x expects embeddings, so you must provide them or let the server handle it if configured
    // Here we send only text, assuming server-side embedding
    await axios.post(
      `${CHROMA_URL}/api/v1/collections/${COLLECTION_NAME}/documents`,
      {
        documents: docs.map((text, i) => ({
          id: `lore-${i}`,
          text,
          metadata: { source: "lore_file" },
        })),
      }
    );
    console.log("Documents added to ChromaDB.");
  } catch (err) {
    console.error("Error adding documents:", err.message);
    process.exit(1);
  }
}

async function main() {
  const loreFile = process.argv[2];
  if (!loreFile) {
    console.error("Usage: node lore_ingest.js <lore_file.txt>");
    process.exit(1);
  }
  const lorePath = path.resolve(loreFile);
  const loreText = fs.readFileSync(lorePath, "utf-8");
  // Split lore into paragraphs or lines for chunking
  const loreChunks = loreText
    .split(/\n\n|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  await createCollection();
  await addDocuments(loreChunks);
}

main();
