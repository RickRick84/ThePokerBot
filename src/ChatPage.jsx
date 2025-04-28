import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa'; // Importamos el ícono de casita
import './App.css';

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
    invalidOpenAIResponse: 'Não foi possível obter una resposta válida da OpenAI.',
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


function ChatPage() { // Nombre del componente
  const { lang } = useParams();
  const [currentLang, setCurrentLang] = useState(lang || 'es');

  // Obtenemos las traducciones para el idioma actual, o español si no se encuentra
  const t = translations[currentLang] || translations['es'];


  const [messages, setMessages] = useState([
    { role: 'system', content: t.system },
    { role: 'assistant', content: t.welcome }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null);
  const lastMessageRef = useRef(null); // <-- Referencia al último mensaje para scrollear a él

  // Creamos una referencia a un objeto de Audio para el sonido del botón Enviar
  const sendAudioRef = useRef(new Audio('/sounds/button-click.mp3')); // <-- Asegúrate que esta ruta y nombre de archivo sean correctos

  // Función para reproducir el sonido de envío
  const playSendSound = () => {
    // Reinicia el sonido al principio
    sendAudioRef.current.currentTime = 0;
    // Intenta reproducir el sonido
    sendAudioRef.current.play().catch(error => console.error("Error playing send sound:", error));
  };


  // Efecto para scrollear al final cuando los mensajes cambian
  useEffect(() => {
    if (lastMessageRef.current) {
      // <-- AJUSTADO: Scrollear al inicio del último mensaje
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (chatBoxRef.current) {
       // Si por alguna razón no tenemos referencia al último mensaje (ej: primer mensaje),
       // scrolleamos al fondo del chatbox (comportamiento original)
       chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]); // Depende de los mensajes


  // Efecto para actualizar el idioma si cambia el parámetro de la URL
  useEffect(() => {
      setCurrentLang(lang || 'es');
      // Si quieres reiniciar la conversación al cambiar de idioma en la URL, descomenta lo siguiente:
      // setMessages([ { role: 'system', content: translations[lang]?.system || translations['es'].system }, { role: 'assistant', content: translations[lang]?.welcome || translations['es'].welcome } ]);
  }, [lang]);


  // Lógica principal para enviar el mensaje (sin sonido)
  const sendMessageLogic = async () => {
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
          content: t.openaiError(data.error.code, data.error.message)
        }]);
      } else {
        console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
        setMessages(currentMessages => [...currentMessages, {
          role: 'assistant',
          content: t.invalidOpenAIResponse
        }]);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      setMessages(currentMessages => [...currentMessages, {
        role: 'assistant',
        content: t.fetchError
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handler para el click del botón
  const handleButtonClick = () => {
      playSendSound(); // <-- Reproduce el sonido
      sendMessageLogic(); // <-- Llama a la lógica de envío
  }

  // Handler para la tecla Enter en el input
  const handleKeyDownOptimized = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Previene la acción por defecto del Enter
        playSendSound(); // <-- Reproduce el sonido
        sendMessageLogic(); // <-- Llama a la lógica de envío
      }
  }


  return (
    // Usamos Fragment <> </> para poder retornar el Link Y el div.app
    <>
      {/* Enlace con ícono de Home */}
      {/* Asegúrate que el tamaño y posición aquí sea el que te gustó */}
      <Link to="/" className="home-link">
        <FaHome size={15} /> {/* <-- Verifica este tamaño */}
      </Link>

      {/* Contenedor principal con estilo fijo y centrado */}
      <div className="app"> {/* Reutiliza la clase 'app' */}

        {/* Estructura y estilos para el logo */}
        <div className="title-container">
          <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" />
        </div>

        {/* La caja de chat con el scroll */}
        <div className="chat-box" ref={chatBoxRef}>
          {messages.slice(1).map((msg, idx, arr) => ( // slice(1) para no mostrar mensaje system
            // Añadimos la referencia al último elemento
            <div
              key={idx}
              className={`message ${msg.role}`}
              ref={idx === arr.length - 1 ? lastMessageRef : null} // <-- Asigna la ref al último mensaje
            >
              <span>{msg.content}</span>
            </div>
          ))}
          {loading && (
             <div className="message assistant" ref={messages.slice(1).length === 0 ? lastMessageRef : null}> {/* También asigna la ref al mensaje de "Escribiendo" si es el primero */}
               <span>{t.writing}</span>
             </div>
          )}
        </div>

        {/* La barra de entrada */}
        <div className="input-bar">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDownOptimized} // <-- Usamos el nuevo handler con sonido
            placeholder={t.placeholder}
          />
          {/* <-- Usamos el nuevo handler con sonido en el botón */}
          <button onClick={handleButtonClick} disabled={loading}>{t.sendButton}</button>
        </div>
      </div>
    </> // Cerramos el Fragment
  );
}

export default ChatPage; // Exportamos el componente