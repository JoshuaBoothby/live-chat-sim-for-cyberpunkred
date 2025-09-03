import React from "react";

export default function ChatWindow({ messages, loading }) {
  return (
    <div
      style={{
        height: 400,
        overflowY: "auto",
        border: "1px solid #333",
        padding: 10,
      }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{ textAlign: msg.sender === "You" ? "right" : "left" }}
        >
          <b>{msg.sender}:</b> {msg.text}
        </div>
      ))}
      {loading && (
        <div>
          <i>Edgerunner is typing...</i>
        </div>
      )}
    </div>
  );
}
