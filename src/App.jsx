import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Responde solo sobre póker. Si te preguntan otra cosa, decí que solo hablás de póker.' },
    { role: 'assistant', content: '¡Hola! Soy tu asistente experto en póker. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo', // O el modelo que estés usando
        messages: newMessages, // Enviamos la conversación completa
        temperature: 0.7, // O la temperatura que prefieras
      };

      console.log("📤 Enviando a backend:", payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        const reply = data.choices[0].message;
        setMessages(currentMessages => [...currentMessages, reply]); // Usamos la forma de actualizaci\u00F3n con funci\u00F3n para asegurar el estado m\u00E1s reciente
      } else if (data.error) {
        console.error("❌ Error en la respuesta de OpenAI:", data.error);
        setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualizaci\u00F3n con funci\u00F3n
          role: 'assistant',
          content: `Error de OpenAI: ${data.error.code || 'C\u00F3digo desconocido'} - ${data.error.message || 'Error desconocido'}`
        }]);
      } else {
        console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
        setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualizaci\u00F3n con funci\u00F3n
          role: 'assistant',
          content: 'No se pudo obtener una respuesta v\u00E1lida de OpenAI.'
        }]);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualizaci\u00F3n con funci\u00F3n
        role: 'assistant',
        content: 'Ocurri\u00F3 un error al conectarse con la API.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <div className="title-container">
        {/* Image element for the title */}
        <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" />
      </div>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.slice(1).map((msg, idx) => ( // Usamos slice(1) para no mostrar el mensaje system inicial
          <div key={idx} className={`message ${msg.role}`}>
            <span>{msg.content}</span>
          </div>
        ))}
        {loading && <div className="message assistant"><span>Escribiendo...</span></div>}
      </div>
      <div className="input-bar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu pregunta sobre póker..."
        />
        <button onClick={sendMessage} disabled={loading}>Enviar</button>
      </div>
    </div>
  );
}

export default App;


