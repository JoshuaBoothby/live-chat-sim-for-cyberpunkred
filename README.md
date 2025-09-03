# Cyberpunk RED Live Chat (Local)

A local AI-powered live chat generator for a media Edgerunner in Cyberpunk RED.

## Getting Started

### Backend

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Start your local LLM (e.g., Ollama: `ollama run llama3`)
3. Start the backend:
   ```bash
   node server.js
   ```

### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend:

   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Customization

- Edit the system prompt in `backend/ai/local-llm.js` to tweak the AI's personality or lore.
- Style the chat UI in `frontend/src/components/ChatWindow.jsx`.

---

## Requirements

- Node.js (v18+ recommended)
- [Ollama](https://ollama.com/) or another local LLM server
