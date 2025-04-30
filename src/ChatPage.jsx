import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
const clickSound = new Audio('/sounds/button-click.mp3');

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');

  // Mensaje de bienvenida + scroll inicial
  useEffect(() => {
    setMessages([{ role: 'assistant', content: translations[lang].welcome }]);
    setTimeout(() => {
      const chatBox = document.querySelector('.chat-box');
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }, 300);
  }, [lang]);

  // Scroll automático en cada actualización
  useEffect(() => {
    const chatBox = document.querySelector('.chat-box');
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
  
    const newMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true); // MOSTRAR LOS PUNTOS SUSPENSIVOS
  
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, lang }),
      });
  
      const data = await res.json();
      const fullMessage = data.choices[0].message;
      let index = 0;
      let current = '';
  
      setMessages(prev => [...prev, { ...fullMessage, content: '' }]);
  
      const typeInterval = setInterval(() => {
        if (index < fullMessage.content.length) {
          current += fullMessage.content[index];
          setMessages(prev => [
            ...prev.slice(0, -1),
            { ...fullMessage, content: current }
          ]);
          index++;
        } else {
          clearInterval(typeInterval);
          setIsLoading(false); // OCULTAR LOS PUNTOS SUSPENSIVOS
        }
      }, 15);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Oops! Algo falló al responder.'
      }]);
      setIsLoading(false); // OCULTAR LOS PUNTOS TAMBIÉN EN ERROR
    }
  };
  

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="chat-page-container">
      <Link to="/" className="home-link" onClick={playClickSound}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="#00ff88" viewBox="0 0 24 24" width="20" height="20">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </Link>

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
      
      {isLoading && (
  <div className="message assistant">
    <span className="loading-dots"></span>
  </div>
)}
      <div className="input-bar">
        <input
          type="text"
          placeholder={translations[lang].placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={() => { playClickSound(); handleSend(); }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20"
            viewBox="0 0 24 24"
            width="20"
            fill="#000"
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <path d="M3.4 20.4l1.6-5.6 12.6-12.6 4.6 4.6-12.6 12.6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
