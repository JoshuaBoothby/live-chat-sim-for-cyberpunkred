import React from "react";

export default function ChatWindow({ messages, loading }) {
  return (
    <div className="chat-window">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="chat-message"
          style={{ textAlign: msg.sender === "You" ? "right" : "left" }}
        >
          <span className="username">{msg.sender}:</span> {msg.text}
        </div>
      ))}
      {loading && (
        <div className="chat-message">
          <i>Edgerunner is typing...</i>
        </div>
      )}
    </div>
  );
}
