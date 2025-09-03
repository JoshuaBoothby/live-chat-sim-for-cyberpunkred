const { ChromaClient } = require("chromadb");
const { pipeline } = require("@xenova/transformers");

// Query ChromaDB for relevant lore
async function getRelevantLore(query, n_results = 2) {
  const chroma = new ChromaClient();
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

// Example usage:
(async () => {
  const lore = await getRelevantLore("Tell me about Maelstrom and Watson");
  console.log("Relevant lore:", lore);
})();
