const { ChromaClient } = require("chromadb");
const { pipeline } = require("@xenova/transformers");
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
    await axios.post(
      `${CHROMA_URL}/api/v1/collections/${COLLECTION_NAME}/documents`,
      {
        documents: docs.map((entry) => ({
          id: entry.id ? `lore-${entry.id}` : undefined,
          text: entry.text,
          metadata: { source: "lore.json" },
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
  // Always use lore.json in the same directory
  const lorePath = path.resolve(__dirname, "lore.json");
  if (!fs.existsSync(lorePath)) {
    console.error("lore.json not found in backend directory.");
    process.exit(1);
  }
  const loreRaw = fs.readFileSync(lorePath, "utf-8");
  let loreEntries;
  try {
    loreEntries = JSON.parse(loreRaw);
  } catch (e) {
    console.error("Error parsing lore.json:", e.message);
    process.exit(1);
  }
  if (!Array.isArray(loreEntries)) {
    console.error("lore.json must be an array of objects with id and text.");
    process.exit(1);
  }

  await createCollection();
  await addDocuments(loreEntries);
}

main();
