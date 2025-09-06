const { ChromaClient } = require("chromadb");
const fs = require("fs");
const path = require("path");

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8001";
const COLLECTION_NAME = "cyberpunk_lore";

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

  // Connect to ChromaDB and get or create collection
  const chroma = new ChromaClient({ path: CHROMA_URL });
  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
  });

  // Prepare data
  const documents = loreEntries.map((entry) => entry.text);
  const ids = loreEntries.map((entry) => entry.id);
  const metadatas = loreEntries.map((entry) => ({ source: "lore.json" }));

  // Ingest
  await collection.add({ documents, ids, metadatas });
  console.log(`Ingested ${documents.length} lore entries to ChromaDB.`);
}

main().catch(console.error);
