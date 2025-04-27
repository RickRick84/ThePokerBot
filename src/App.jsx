import { useState, useEffect, useRef } from 'react'; // Importamos useEffect y useRef
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Responde solo sobre póker. Si te preguntan otra cosa, decí que solo hablás de póker.' },
    { role: 'assistant', content: '¡Hola! Soy tu asistente experto en póker. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null); // Creamos una referencia al div de la caja de chat

  // Efecto para scrollear al final cuando los mensajes cambian
  useEffect(() => {
    if (chatBoxRef.current) {
      // Scrolleamos el elemento al final
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]); // Este efecto se ejecuta cada vez que el estado 'messages' cambia

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    // Actualizamos el estado de mensajes ANTES de enviar la solicitud a la API
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Usa la URL relativa para Vercel
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
        // Actualizamos el estado de mensajes con la respuesta del bot
        setMessages(currentMessages => [...currentMessages, reply]); // Usamos la forma de actualización con función para asegurar el estado más reciente
      } else if (data.error) {
        console.error("❌ Error en la respuesta de OpenAI:", data.error);
        setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualización con función
          role: 'assistant',
          content: `Error de OpenAI: ${data.error.code || 'Código desconocido'} - ${data.error.message || 'Error desconocido'}`
        }]);
      } else {
        console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
        setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualización con función
          role: 'assistant',
          content: 'No se pudo obtener una respuesta válida de OpenAI.'
        }]);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      setMessages(currentMessages => [...currentMessages, { // Usamos forma de actualización con función
        role: 'assistant',
        content: 'Ocurrió un error al conectarse con la API.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Previene el salto de línea por defecto en el textarea/input
      sendMessage();
    }
  };

  return (
    <div className="app">
      <div className="title-container">
        <h1 className="title">THE POKER BOT</h1>
      </div>
      {/* Adjuntamos la referencia al div de la caja de chat */}
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
        <button onClick={sendMessage} disabled={loading}>Enviar</button> {/* Deshabilitamos el botón mientras carga */}
      </div>
    </div>
  );
}

export default App;


