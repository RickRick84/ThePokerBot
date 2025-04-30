import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function ChatPage() {
  const location = useLocation();
  const lang = new URLSearchParams(location.search).get('lang') || 'en';

  const translations = {
    en: {
      welcome: "Hi! Ask me anything about poker.",
      placeholder: "Type your message..."
    },
    es: {
      welcome: "¡Hola! Preguntame lo que quieras sobre póker.",
      placeholder: "Escribe tu mensaje..."
    },
    pt: {
      welcome: "Olá! Pergunte o que quiser sobre pôquer.",
      placeholder: "Digite sua mensagem..."
    }
  };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    setMessages([{ role: 'assistant', content: translations[lang].welcome }]);
  }, [lang]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, lang }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, data.choices[0].message]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Oops! Algo falló al responder.'
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="chat-page-container">
      <Link to="/" className="home-link">🏠</Link>

      <div className="chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      <div className="input-bar">
        <input
          type="text"
          placeholder={translations[lang].placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20"
            viewBox="0 0 24 24"
            width="20"
            fill="#000"
          >
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M3.4 20.4l1.6-5.6 12.6-12.6 4.6 4.6-12.6 12.6z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
