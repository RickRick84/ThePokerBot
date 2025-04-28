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
    fetchError: 'Ocurrió un error al conectar con la API.',
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


  // Efecto para scrollear al inicio del último mensaje cuando los mensajes cambian
  useEffect(() => {
    // Solo scrollear si tenemos una referencia al último mensaje Y hay mensajes más allá del inicial del sistema.
    // También disparamos el scroll cuando loading cambia, para reaccionar al fin de la carga.
     if (lastMessageRef.current && messages.length > 1) {
          // Usamos un pequeño timeout para asegurarnos de que el DOM se actualizó con el último mensaje
          // El timeout es crucial porque los mensajes se agregan al estado, pero la renderización
          // del DOM puede tomar un instante, especialmente con respuestas largas.
          const timeoutId = setTimeout(() => {
               console.log("Attempting to scroll to:", lastMessageRef.current);
               lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100); // Aumentamos el delay a 100ms. Si sigue fallando, prueba con 200ms.
          return () => clearTimeout(timeoutId); // Limpiar el timeout si los mensajes cambian de nuevo rápido
     } else if (chatBoxRef.current && messages.length <= 1) {
          // Comportamiento al inicio del chat o solo con el mensaje del sistema: scrollear al fondo
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
     }
  }, [messages, loading]); // Depende de los mensajes y el estado de carga


  // Efecto para actualizar el idioma si cambia el parámetro de la URL
  useEffect(() => {
      setCurrentLang(lang || 'es');
      // Si quieres reiniciar la conversación al cambiar de idioma en la URL, descomenta lo siguiente:
      // setMessages([ { role: 'system', content: translations[lang]?.system || translations['es'].system }, { role: 'assistant', content: translations[lang]?.welcome || translations['es'].welcome } ]);
  }, [lang]);


  // Lógica principal para enviar el mensaje (AHORA MANEJA STREAMING Y NO-STREAMING)
  const sendMessageLogic = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    // Agregamos el mensaje del usuario y un placeholder para la respuesta del asistente
    setMessages(currentMessages => [...currentMessages, userMessage, { role: 'assistant', content: '' }]); // Añadimos un mensaje vacío para el streaming
    setInput('');
    setLoading(true);

    try {
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo',
        messages: [...messages, userMessage], // Enviar todos los mensajes incluyendo el último del usuario
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

      // Verificar si la respuesta es un error HTTP
      if (!response.ok) {
          // Si la respuesta no es OK, intentamos leerla como JSON (puede ser un error de la API)
          try {
            const errorData = await response.json();
            console.error('❌ Error en la respuesta del backend:', response.status, errorData);
            // Mostrar un mensaje de error en el chat (modificando el último mensaje vacío)
            setMessages(currentMessages => {
              const lastMessageIndex = currentMessages.length - 1;
              const updatedMessages = [...currentMessages];
              updatedMessages[lastMessageIndex] = {
                  role: 'assistant',
                  content: errorData.error || `HTTP error! status: ${response.status}`
              };
              return updatedMessages;
            });
          } catch (jsonError) {
            // Si no pudimos leer el error como JSON, mostramos un error HTTP genérico
            console.error('❌ Error HTTP no-JSON en la respuesta del backend:', response.status, jsonError);
            setMessages(currentMessages => {
              const lastMessageIndex = currentMessages.length - 1;
              const updatedMessages = [...currentMessages];
              updatedMessages[lastMessageIndex] = {
                  role: 'assistant',
                  content: `HTTP error! status: ${response.status}`
              };
              return updatedMessages;
            });
          }
          return; // Salir de la función si hay un error
      }

        // --- PROCESAR LA RESPUESTA (AHORA SOPORTA STREAMING Y NO-STREAMING) ---
        const contentType = response.headers.get('Content-Type');

        if (contentType && contentType.includes('text/event-stream')) {
            // --- MANEJAR RESPUESTA STREAMING (SSE) ---
            console.log("✅ Recibiendo respuesta streaming (SSE).");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = ''; // Acumula los chunks
            let assistantResponse = ''; // Acumula el contenido del asistente
            let messageIndexToUpdate = messages.length; // Índice del mensaje del asistente que estamos construyendo (el que añadimos vacío)

            // No eliminamos el mensaje vacío temporal, lo usaremos para construir la respuesta.
            // setMessages(currentMessages => currentMessages.slice(0, -1)); // Eliminada esta línea


            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log("Stream terminado.");
                    break; // El stream terminó
                }

                // Decodifica el chunk y lo añade al buffer
                buffer += decoder.decode(value, { stream: true });

                // Procesa el buffer línea por línea, buscando delimitadores SSE (\n\n)
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // Mantiene el último fragmento incompleto

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6); // Elimina el prefijo "data: "
                        if (jsonStr === '[DONE]') {
                            console.log("Recibido [DONE], stream completo.");
                            continue; // Ignorar el mensaje de fin de stream
                        }
                        if (jsonStr) {
                            try {
                                const chunk = JSON.parse(jsonStr);
                                // Procesa el chunk para extraer el contenido de la respuesta
                                const deltaContent = chunk.choices?.[0]?.delta?.content;
                                if (deltaContent) {
                                    assistantResponse += deltaContent;
                                    // Actualiza el último mensaje en el estado con el contenido acumulado
                                    setMessages(currentMessages => {
                                        const updatedMessages = [...currentMessages];
                                        // Actualiza el mensaje del asistente en el índice correcto
                                        updatedMessages[messageIndexToUpdate] = {
                                            role: 'assistant', // Aseguramos el rol
                                            content: assistantResponse
                                        };
                                        return updatedMessages;
                                    });
                                }
                            } catch (e) {
                                console.error("❌ Error parsing stream chunk JSON:", jsonStr, e);
                                // Si hay un error de parseo en un chunk, mostramos un error en un nuevo mensaje
                                setMessages(currentMessages => [...currentMessages, {
                                     role: 'assistant',
                                     content: t.fetchError + ' (Error de parseo en stream: ' + e.message + ')'
                                }]);
                                reader.cancel(); // Cancelar la lectura del stream si hay error
                                break; // Salir del loop while(true)
                            }
                        }
                    } else if (line) {
                         // Manejar líneas que no tienen el prefijo "data: ",
                         // si tu backend no lo añade pero sí envía JSONs separados por \n\n
                         // Este bloque es menos común para streams SSE directos de OpenAI pero lo mantenemos por robustez.
                         try {
                            const chunk = JSON.parse(line);
                            const deltaContent = chunk.choices?.[0]?.delta?.content;
                            if (deltaContent) {
                                assistantResponse += deltaContent;
                                setMessages(currentMessages => {
                                    const updatedMessages = [...currentMessages];
                                    updatedMessages[messageIndexToUpdate] = {
                                         role: 'assistant', // Aseguramos el rol
                                         content: assistantResponse
                                    };
                                    return updatedMessages;
                                });
                            }
                         } catch (e) {
                            console.error("❌ Error parsing raw JSON line:", line, e);
                             setMessages(currentMessages => [...currentMessages, {
                                 role: 'assistant',
                                 content: t.fetchError + ' (Error de parseo de línea raw: ' + e.message + ')'
                            }]);
                            reader.cancel();
                            break;
                         }
                    }
                }
            }
            // Después de que el while(true) termine (done es true o se canceló)
            console.log("Fin del procesamiento del stream.");
            // No hacemos nada aquí con setMessages porque ya se actualizó en el loop.


        } else {
            // --- MANEJAR RESPUESTA NO-STREAMING (JSON completo) ---
            console.log("📦 Recibiendo respuesta JSON completa (no streaming).");
            const data = await response.json(); // Esperamos el JSON completo

            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                 // Reemplaza el último mensaje vacío temporal con la respuesta completa
                setMessages(currentMessages => {
                     const lastMessageIndex = currentMessages.length - 1; // El último que añadimos (placeholder)
                     const updatedMessages = [...currentMessages];
                     updatedMessages[lastMessageIndex] = data.choices[0].message; // Reemplaza el placeholder
                     return updatedMessages;
                });
            } else if (data.error) {
                console.error("❌ Error en la respuesta de OpenAI (no stream):", data.error);
                 // Modifica el último mensaje vacío con el error
                 setMessages(currentMessages => {
                    const lastMessageIndex = currentMessages.length - 1;
                    const updatedMessages = [...currentMessages];
                    updatedMessages[lastMessageIndex] = {
                         role: 'assistant',
                         content: t.openaiError(data.error.code, data.error.message)
                    };
                    return updatedMessages;
                 });
            } else {
                console.error("❌ Formato inesperado de respuesta de OpenAI (no stream):", data);
                 // Modifica el último mensaje vacío con el error
                 setMessages(currentMessages => {
                    const lastMessageIndex = currentMessages.length - 1;
                    const updatedMessages = [...currentMessages];
                    updatedMessages[lastMessageIndex] = {
                         role: 'assistant',
                         content: t.invalidOpenAIResponse
                    };
                    return updatedMessages;
                 });
            }
        }


    } catch (error) {
      console.error("❌ Error general en fetch:", error); // <-- console.error mantenido
      // Mostrar un mensaje de error general de conexión o fetch (modificando el último mensaje vacío)
       setMessages(currentMessages => {
             const lastMessageIndex = currentMessages.length - 1;
             const updatedMessages = [...currentMessages];
             updatedMessages[lastMessageIndex] = {
                  role: 'assistant',
                  content: t.fetchError + ' (' + error.message + ')' // Incluir mensaje del error
             };
             return updatedMessages;
         });

    } finally {
      setLoading(false); // Terminar carga
    }
  };

  // Handler para el click del botón (llama a la lógica de envío)
  const handleButtonClick = () => {
      playSendSound(); // Reproduce el sonido
      sendMessageLogic(); // Llama a la lógica de envío
  }

  // Handler para la tecla Enter en el input (llama a la lógica de envío)
  const handleKeyDownOptimized = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Previene la acción por defecto del Enter
        if (!loading) { // Solo enviar si no estamos cargando ya
           playSendSound(); // Reproduce el sonido
           sendMessageLogic(); // Llama a la lógica de envío
        }
      }
  }


  return (
    // Usamos Fragment <> </> para poder retornar el Link Y el div.app
    <>
      {/* Enlace con ícono de Home */}
      {/* Asegúrate que el tamaño y posición aquí sea el que te gustó */}
      <Link to="/" className="home-link">
        <FaHome size={15} /> {/* Verifica este tamaño */}
      </Link>

      {/* Contenedor principal con estilo fijo y centrado */}
      <div className="app chat-page-container">

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
           {/* Mensaje de "Escribiendo..." (visible mientras loading sea true) */}
           {loading && (
               <div className="message assistant">
                 <span>{t.writing}</span>
               </div>
           )}
        </div>

        {/* La barra de entrada */}
        <div className="input-bar">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDownOptimized}
            placeholder={t.placeholder}
            disabled={loading} // Deshabilitar input mientras carga
          />
          <button onClick={handleButtonClick} disabled={loading}>{t.sendButton}</button>
        </div>
      </div>
    </> // Cerramos el Fragment
  );
}

export default ChatPage; // Exportamos el componente