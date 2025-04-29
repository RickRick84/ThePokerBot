import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa'; // Importamos el ícono de casita
import './App.css'; // Asegúrate de que este archivo CSS existe y se carga

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
    fetchError: 'Ocorreu um error ao conectar com a API.',
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

  // Inicializamos con solo el mensaje del sistema
  const [messages, setMessages] = useState([
    { role: 'system', content: t.system }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null);

  // Creamos una referencia a un objeto de Audio para el sonido del botón Enviar
  const sendAudioRef = useRef(new Audio('/sounds/button-click.mp3')); // <-- Asegúrate que esta ruta y nombre de archivo sean correctos

  // Función para reproducir el sonido de envío
  const playSendSound = () => {
    // Reinicia el sonido al principio
    sendAudioRef.current.currentTime = 0;
    // Intenta reproducir el sonido
    sendAudioRef.current.play().catch(error => console.error("Error playing send sound:", error));
  };

  // Efecto para scrollear al final del chat cuando los mensajes cambian o carga termina
  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (chatBox) {
        // Usamos un pequeño timeout para asegurarnos de que el DOM se actualizó
        const timeoutId = setTimeout(() => {
          chatBox.scrollTop = chatBox.scrollHeight;
          console.log("Attempting to scroll to bottom. ScrollHeight:", chatBox.scrollHeight);
        }, 50); // Un delay corto, 50ms suele ser suficiente
        return () => clearTimeout(timeoutId);
    }
  }, [messages, loading]); // Depende de los mensajes y el estado de carga

  // Efecto para actualizar el idioma Y AÑADIR EL MENSAJE DE BIENVENIDA cuando el idioma esté listo
  useEffect(() => {
      setCurrentLang(lang || 'es');
      // Añadir el mensaje de bienvenida solo si no está ya presente y el idioma ha sido establecido
      // Verificamos si messages tiene solo el mensaje del sistema
      if (messages.length === 1 && messages[0].role === 'system') {
          setMessages(currentMessages => [
              ...currentMessages,
              { role: 'assistant', content: translations[lang]?.welcome || translations['es'].welcome }
          ]);
      }
      // Si quieres reiniciar la conversación COMPLETAMENTE al cambiar de idioma en la URL, descomenta lo siguiente y modifica el de arriba:
      // setMessages([ { role: 'system', content: translations[lang]?.system || translations['es'].system }, { role: 'assistant', content: translations[lang]?.welcome || translations['es'].welcome } ]);

  }, [lang, messages.length]); // Depende del idioma y la cantidad de mensajes (para no añadir múltiples bienvenidas)


  // Lógica principal para enviar el mensaje (AHORA MANEJA STREAMING Y NO-STREAMING)
  const sendMessageLogic = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    let messageIndexToUpdate = -1;
    setMessages(currentMessages => {
        const updatedMessages = [...currentMessages, userMessage, { role: 'assistant', content: '' }];
        messageIndexToUpdate = updatedMessages.length - 1;
        return updatedMessages;
    });

    setInput('');
    setLoading(true);

    try {
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo',
        // Pasamos todos los mensajes actuales, incluyendo el del sistema
        messages: [...messages, userMessage], // No añadir el mensaje del asistente vacío aquí, se crea en setMessages
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

      if (!response.ok) {
          try {
            const errorData = await response.json();
            console.error('❌ Error en la respuesta del backend:', response.status, errorData);
            setMessages(currentMessages => {
              const updatedMessages = [...currentMessages];
                if (updatedMessages[messageIndexToUpdate]) {
                    updatedMessages[messageIndexToUpdate] = {
                      role: 'assistant',
                      content: errorData.error || `HTTP error! status: ${response.status}`
                    };
                } else { updatedMessages.push({ role: 'assistant', content: errorData.error || `HTTP error! status: ${response.status}` }); }
              return updatedMessages;
            });
          } catch (jsonError) {
            console.error('❌ Error HTTP no-JSON en la respuesta del backend:', response.status, jsonError);
            setMessages(currentMessages => {
              const updatedMessages = [...currentMessages];
                 if (updatedMessages[messageIndexToUpdate]) {
                   updatedMessages[messageIndexToUpdate] = { role: 'assistant', content: `HTTP error! status: ${response.status}` };
                 } else { updatedMessages.push({ role: 'assistant', content: `HTTP error! status: ${response.status}` }); }
              return updatedMessages;
            });
          }
          return;
      }

        const contentType = response.headers.get('Content-Type');
        const isStreaming = contentType && contentType.includes('text/event-stream');

        if (isStreaming) {
            console.log("✅ Recibiendo respuesta streaming (SSE).");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let assistantResponse = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log("Stream terminado.");
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr === '[DONE]') {
                            console.log("Recibido [DONE], stream completo.");
                            continue;
                        }
                        if (jsonStr) {
                            try {
                                const chunk = JSON.parse(jsonStr);
                                const deltaContent = chunk.choices?.[0]?.delta?.content;
                                if (deltaContent) {
                                    assistantResponse += deltaContent;
                                    // >>> AJUSTE CLAVE AQUÍ: Crear una copia inmutable del array y objeto, y actualizar contenido <<<
                                    setMessages(currentMessages => {
                                        const updatedMessages = [...currentMessages];
                                        if (updatedMessages[messageIndexToUpdate]) {
                                            updatedMessages[messageIndexToUpdate] = {
                                                ...updatedMessages[messageIndexToUpdate],
                                                content: assistantResponse
                                            };
                                        } else { console.warn("Streaming: Índice no encontrado, añadiendo nuevo mensaje."); return [...currentMessages, { role: 'assistant', content: assistantResponse }]; }
                                        return updatedMessages;
                                    });
                                }
                            } catch (e) {
                                console.error("❌ Error parsing stream chunk JSON:", jsonStr, e);
                                setMessages(currentMessages => [...currentMessages, { role: 'assistant', content: t.fetchError + ' (Error de parseo en stream: ' + e.message + ')' }]);
                                reader.cancel(); break;
                            }
                        }
                    } else if (line) {
                          try {
                            const chunk = JSON.parse(line);
                            const deltaContent = chunk.choices?.[0]?.delta?.content;
                            if (deltaContent) {
                                assistantResponse += deltaContent;
                                setMessages(currentMessages => {
                                    const updatedMessages = [...currentMessages];
                                     if (updatedMessages[messageIndexToUpdate]) {
                                        updatedMessages[messageIndexToUpdate] = {
                                            ...updatedMessages[messageIndexToUpdate],
                                            content: assistantResponse
                                        };
                                     } else { console.warn("Streaming: Índice (raw) no encontrado, añadiendo nuevo mensaje."); return [...currentMessages, { role: 'assistant', content: assistantResponse }]; }
                                    return updatedMessages;
                                });
                            }
                          } catch (e) {
                             console.error("❌ Error parsing raw JSON line:", line, e);
                              setMessages(currentMessages => [...currentMessages, { role: 'assistant', content: t.fetchError + ' (Error de parseo de línea raw: ' + e.message + ')' }]);
                              reader.cancel(); break;
                          }
                    }
                }
            }
            console.log("Fin del procesamiento del stream.");


        } else {
            console.log("📦 Recibiendo respuesta JSON completa (no streaming).");
            const data = await response.json();

            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                setMessages(currentMessages => {
                       const updatedMessages = [...currentMessages];
                       if (updatedMessages[messageIndexToUpdate]) { updatedMessages[messageIndexToUpdate] = data.choices[0].message; }
                       else { updatedMessages.push(data.choices[0].message); }
                       return updatedMessages;
                   });
            } else if (data.error) {
                    setMessages(currentMessages => {
                       const updatedMessages = [...currentMessages];
                       if (updatedMessages[messageIndexToUpdate]) { updatedMessages[messageIndexToUpdate] = { role: 'assistant', content: t.openaiError(data.error.code, data.error.message) }; }
                       else { updatedMessages.push({ role: 'assistant', content: t.openaiError(data.error.code, data.error.message) }); }
                       return updatedMessages;
                   });
            } else {
                    setMessages(currentMessages => {
                       const updatedMessages = [...currentMessages];
                       if (updatedMessages[messageIndexToUpdate]) { updatedMessages[messageIndexToUpdate] = { role: 'assistant', content: t.invalidOpenAIResponse }; }
                       else { updatedMessages.push({ role: 'assistant', content: t.invalidOpenAIResponse }); }
                       return updatedMessages;
                   });
            }
        }


    } catch (error) {
      console.error("❌ Error general en fetch:", error);
       setMessages(currentMessages => {
             const updatedMessages = [...currentMessages];
             if (updatedMessages[messageIndexToUpdate]) { updatedMessages[messageIndexToUpdate] = { role: 'assistant', content: t.fetchError + ' (' + error.message + ')' }; }
             else { updatedMessages.push({ role: 'assistant', content: t.fetchError + ' (' + error.message + ')' }); }
             return updatedMessages;
           });

    } finally {
      setLoading(false);
    }
  };

  // Handler para el click del botón (llama a la lógica de envío)
  const handleButtonClick = () => {
      playSendSound();
      sendMessageLogic();
  }

  // Handler para la tecla Enter en el input (llama a la lógica de envío)
  const handleKeyDownOptimized = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!loading) {
            playSendSound();
            sendMessageLogic();
        }
      }
  }


  return (
    <>
      {/* Icono de casita para volver al Home */}
      <Link to="/" className="home-link">
        <FaHome size={15} />
      </Link>

      {/* Contenedor principal de la página de chat */}
      <div className="app chat-page-container">

        {/* Contenedor del título (ahora sin la etiqueta img del logo) */}
        <div className="title-container">
          {/* La imagen del logo ahora está en el background-image del body */}
          <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" /> {/* ELIMINAR ESTA LINEA */}
          {/* Si necesitas un título de texto aquí, iría dentro de este div */}
        </div>

        {/* Caja de chat donde se muestran los mensajes */}
        <div className="chat-box" ref={chatBoxRef}>
          {messages.slice(1).map((msg, idx) => ( // Usamos slice(1) para omitir el mensaje 'system'
            // Cada mensaje individual
            <div
              key={idx}
              className={`message ${msg.role}`} // Clases 'user' o 'assistant'
            >
              {/* El contenido del mensaje */}
              {/* Agregamos estilos en línea directamente al span para forzar renderización y wrap */}
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'inline-block' }}>{msg.content}</span>
            </div>
          ))}
            {loading && (
                // Indicador de 'Escribiendo...' mientras el bot piensa
                <div className="message assistant">
                    <span>{t.writing}</span>
                </div>
            )}
        </div>

        {/* Barra de entrada para escribir mensajes */}
        <div className="input-bar">
          {/* Input de texto */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)} // Actualiza el estado del input
            onKeyDown={handleKeyDownOptimized} // Maneja la tecla Enter
            placeholder={t.placeholder} // Placeholder traducido
            disabled={loading} // Deshabilita mientras carga
          />
          {/* Botón de enviar */}
          <button onClick={handleButtonClick} disabled={loading}>{t.sendButton}</button> {/* Texto del botón traducido */}
        </div>
      </div>
    </>
  );
}

export default ChatPage; // Exportamos el componente