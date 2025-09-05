import React, { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";

// --- Persona and Event Data ---
const personas = [
  { username: "NetrunnerFan42", style: "geeky and excitable" },
  { username: "ChromedJock88", style: "skeptical and brash" },
  { username: "GlitterGrrl", style: "sarcastic and stylish" },
  { username: "ChromePixie", style: "troll, chaotic, leetspeak" },
];

const streamEvents = [
  "Garygur just dropped a new exposé on SovOil.",
  "Garygur and his agent (his smart phone) are jamming live from The Forlorn Hope.",
  "Garygur is interviewing a Nomad convoy leader.",
  "Garygur's latest braindance review is trending.",
  "Garygur is streaming a live gig in Watson.",
];

function personaPrompt(username, style) {
  return `You are ${username}, a random chatter in Garygur's live stream in Night City.\nGarygur is a buff Media/Rockerboy who live streams with his agent (his smart phone).\nSpeak in short, slangy bursts. Stay in Cyberpunk Red vibe (${style}).\nNever write more than 1–2 lines.`;
}

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "Edgerunner",
      text: "Welcome to Night City, choomba! What's the scoop?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(streamEvents[0]);
  const [eventInput, setEventInput] = useState("");

  // User message send (kept for manual input)
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: "You", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        history: newMessages.map((m) => ({
          role: m.sender === "You" ? "user" : "assistant",
          content: m.text,
        })),
      }),
    });
    const data = await res.json();
    setMessages([
      ...newMessages,
      { sender: "Edgerunner", text: data.response },
    ]);
    setLoading(false);
  };

  // Simulate random viewer chat line
  const generateRandomChatLine = async () => {
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const event = currentEvent;
    const finalPrompt =
      personaPrompt(persona.username, persona.style) +
      `\nStream Event: ${event}\nChat response:`;

    setLoading(true);
    const res = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: finalPrompt, history: [] }),
    });
    const data = await res.json();
    // Split the response into multiple lines and add each as a separate message
    const lines = data.response
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setMessages((prev) => [
      ...prev,
      ...lines.map((text) => ({ sender: persona.username, text })),
    ]);
    setLoading(false);
  };

  // Auto-generate chat lines every 4-6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      generateRandomChatLine();
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="chat-container">
      <div className="chat-header">Cyberpunk RED Live Chat</div>
      <div
        style={{ marginBottom: 18, fontWeight: "bold", textAlign: "center" }}
      >
        Current Event: {currentEvent}
      </div>
      <div style={{ marginBottom: 18, textAlign: "center" }}>
        <input
          value={eventInput}
          onChange={(e) => setEventInput(e.target.value)}
          placeholder="Describe the current in-game event..."
          style={{
            width: "90%",
            marginRight: 8,
            fontSize: "1.1rem",
            padding: "6px 12px",
          }}
        />
        <button
          onClick={() => {
            if (eventInput.trim()) {
              setCurrentEvent(eventInput);
              setEventInput("");
            }
          }}
        >
          Set Event
        </button>
      </div>
      <ChatWindow messages={messages} loading={loading} />
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
        <button onClick={generateRandomChatLine} disabled={loading}>
          Simulate Viewer Message
        </button>
      </div>
    </div>
  );
}

export default App;
