import React from 'react';
import { Link } from 'react-router-dom';

function ChatPage() {
  return (
    <div className="chat-page-container">
       <Link to="/" className="home-link">
          🏠
        </Link>
       <div className="title-container">
       </div>
      <div className="chat-box">
         <div className="message user"><span>Hola!</span></div>
         <div className="message assistant"><span>Hi there! How can I help you?</span></div>
      </div>
      <div className="input-bar">
        <input
          type="text"
          placeholder="Escribe tu mensaje..."
        />
        <button>Enviar</button>
      </div>
    </div>
  );
}

export default ChatPage;