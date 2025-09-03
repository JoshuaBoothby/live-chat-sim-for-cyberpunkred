const { ChromaClient } = require("chromadb");
const { pipeline } = require("@xenova/transformers");
const fs = require("fs");

async function main() {
  const chroma = new ChromaClient();
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // Load lore
  const lore = JSON.parse(fs.readFileSync("lore.json", "utf-8"));

  // Create collection (if not exists)
  const collection = await chroma.createCollection({ name: "cyberpunk_lore" });

  // Ingest lore
  for (const entry of lore) {
    const embedding = await embedder(entry.text);
    await collection.add({
      ids: [entry.id],
      embeddings: [embedding[0][0]], // adjust if needed for your embedder output
      documents: [entry.text],
    });
  }

  console.log("Lore ingested!");
}

main();
