import { useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Responde solo sobre póker. Si te preguntan otra cosa, decí que solo hablás de póker.' },
    { role: 'assistant', content: '¡Hola! Soy tu asistente experto en póker. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Usa la URL relativa para Vercel
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo', // O el modelo que estés usando
        messages: newMessages,
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
        setMessages([...newMessages, reply]);
      } else if (data.error) {
        console.error("❌ Error en la respuesta de OpenAI:", data.error);
        setMessages([...newMessages, {
          role: 'assistant',
          content: `Error de OpenAI: ${data.error.code || 'Código desconocido'} - ${data.error.message || 'Error desconocido'}`
        }]);
      } else {
        console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
        setMessages([...newMessages, {
          role: 'assistant',
          content: 'No se pudo obtener una respuesta válida de OpenAI.'
        }]);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Ocurrió un error al conectarse con la API.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="app">
      <div className="title-container">
        <h1 className="title">THE POKER BOT</h1>
      </div>
      <div className="chat-box">
        {messages.slice(1).map((msg, idx) => (
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
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
}

// ¡Asegúrate de que esta línea esté al final del archivo!
export default App;


