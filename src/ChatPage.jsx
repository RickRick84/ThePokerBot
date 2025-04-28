import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom'; // Importamos useParams para obtener parámetros de la URL
import './App.css'; // Importamos el CSS principal

// Objeto simple para gestionar las traducciones
const translations = {
  es: {
    system: 'Responde solo sobre póker en español. Si te preguntan otra cosa, decí que solo hablás de póker.',
    welcome: '¡Hola! Soy tu asistente experto en póker. ¿En qué puedo ayudarte hoy?',
    placeholder: 'Escribí tu pregunta sobre póker...',
    sendButton: 'Enviar',
    writing: 'Escribiendo...',
    openaiError: (code, message) => `Error de OpenAI: ${code || 'Código desconocido'} - ${message || 'Error desconocido'}`,
    fetchError: 'Ocurrió un error al conectarse con la API.',
    invalidOpenAIResponse: 'No se pudo obtener una respuesta válida de OpenAI.',
  },
  pt: {
    system: 'Responda apenas sobre póquer em português. Se perguntarem outra coisa, diga que só fala sobre póquer.',
    welcome: 'Olá! Eu sou o seu assistente especialista em póquer. Em que posso ajudar hoje?',
    placeholder: 'Escreva sua pergunta sobre póquer...',
    sendButton: 'Enviar',
    writing: 'Escrevendo...',
    openaiError: (code, message) => `Erro da OpenAI: ${code || 'Código desconhecido'} - ${message || 'Erro desconhecido'}`,
    fetchError: 'Ocorreu um erro ao conectar com a API.',
    invalidOpenAIResponse: 'Não foi possível obter uma resposta válida da OpenAI.',
  },
  en: {
    system: 'Respond only about poker in English. If asked anything else, say you only talk about poker.',
    welcome: 'Hello! I am your expert poker assistant. How can I help you today?',
    placeholder: 'Type your poker question...',
    sendButton: 'Send',
    writing: 'Typing...',
    openaiError: (code, message) => `OpenAI Error: ${code || 'Unknown Code'} - ${message || 'Unknown Error'}`,
    fetchError: 'An error occurred while connecting to the API.',
    invalidOpenAIResponse: 'Could not get a valid response from OpenAI.',
  },
};


function ChatPage() { // Cambiamos el nombre de la función a ChatPage
  const { lang } = useParams(); // Obtenemos el parámetro 'lang' de la URL (ej: 'es', 'pt', 'en')
  const [currentLang, setCurrentLang] = useState(lang || 'es'); // Usamos el idioma de la URL, o 'es' por defecto

  // Obtenemos las traducciones para el idioma actual, o español si no se encuentra
  const t = translations[currentLang] || translations['es'];


  const [messages, setMessages] = useState([
    // El primer mensaje es para instruir al modelo, usando la traducción adecuada
    { role: 'system', content: t.system },
    // El segundo mensaje es el de bienvenida visible para el usuario, usando la traducción
    { role: 'assistant', content: t.welcome }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null);

  // Efecto para scrollear al final cuando los mensajes cambian
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Efecto para actualizar el idioma y el mensaje de bienvenida si cambia el parámetro de la URL
  useEffect(() => {
      setCurrentLang(lang || 'es'); // Actualizamos el estado del idioma
      // Podrías querer reiniciar la conversación o traducir los mensajes existentes aquí
      // si el usuario cambia el idioma desde la URL. Por ahora, solo actualizamos el estado
      // y el mensaje de bienvenida se regenerará al montar.
      // Reiniciar conversación al cambiar idioma (opcional, descomentar si lo quieres así)
      // setMessages([ { role: 'system', content: translations[lang]?.system || translations['es'].system }, { role: 'assistant', content: translations[lang]?.welcome || translations['es'].welcome } ]);

  }, [lang]); // Este efecto se ejecuta cada vez que el parámetro 'lang' de la URL cambia


  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo',
        messages: newMessages,
        temperature: 0.7,
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
        setMessages(currentMessages => [...currentMessages, reply]);
      } else if (data.error) {
        console.error("❌ Error en la respuesta de OpenAI:", data.error);
        setMessages(currentMessages => [...currentMessages, {
          role: 'assistant',
          content: t.openaiError(data.error.code, data.error.message) // Usamos traducción para errores
        }]);
      } else {
        console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
        setMessages(currentMessages => [...currentMessages, {
          role: 'assistant',
          content: t.invalidOpenAIResponse // Usamos traducción para errores
        }]);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      setMessages(currentMessages => [...currentMessages, {
        role: 'assistant',
        content: t.fetchError // Usamos traducción para errores
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
    // Reutilizamos la clase 'app' para mantener el centrado fijo y el background
    <div className="app">
      {/* Reutilizamos la estructura y estilos para el logo */}
      <div className="title-container">
        <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" />
      </div>

      {/* La caja de chat con el scroll */}
      <div className="chat-box" ref={chatBoxRef}>
        {messages.slice(1).map((msg, idx) => ( // slice(1) para no mostrar mensaje system
          <div key={idx} className={`message ${msg.role}`}>
            <span>{msg.content}</span>
          </div>
        ))}
        {loading && <div className="message assistant"><span>{t.writing}</span></div>} {/* Usamos texto "Escribiendo..." traducido */}
      </div>

      {/* La barra de entrada */}
      <div className="input-bar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        placeholder={t.placeholder} /* Usamos placeholder traducido */ />
        <button onClick={sendMessage} disabled={loading}>{t.sendButton}</button> {/* Usamos texto del botón traducido */}
      </div>
    </div>
  );
}

export default ChatPage; // Exportamos el componente como ChatPage


