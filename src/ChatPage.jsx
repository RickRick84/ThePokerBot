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
  // Eliminamos lastMessageRef ya que scrollearemos al fondo del chatBox
  // const lastMessageRef = useRef(null); // <-- Referencia al último mensaje para scrollear a él


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
        }, 50); // Un delay corto, 50ms suele ser suficiente después de actualizaciones de estado
        return () => clearTimeout(timeoutId); // Limpiar el timeout
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
    // Añadimos el mensaje del usuario y el placeholder para la respuesta del asistente
    // CAPTURAMOS EL ÍNDICE DEL MENSAJE DEL ASISTENTE JUSTO AQUÍ:
    let messageIndexToUpdate = -1; // Inicializamos con un valor inválido
    setMessages(currentMessages => {
        const updatedMessages = [...currentMessages, userMessage, { role: 'assistant', content: '' }]; // Añadimos el placeholder
        messageIndexToUpdate = updatedMessages.length - 1; // CAPTURAMOS EL ÍNDICE DEL PLACEHOLDER AÑADIDO
        return updatedMessages;
    });

    setInput('');
    setLoading(true);

    try {
      const url = '/api/chat';
      console.log("Usando backend:", url);

      const payload = {
        model: 'gpt-4-turbo',
        // Usamos el estado messages *después* de añadir el mensaje del usuario y el placeholder
        messages: [...messages, userMessage, { role: 'assistant', content: '' }], // Aseguramos que el payload tiene el mensaje del usuario y el placeholder para la API
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
            // Mostrar un mensaje de error en el chat (modificando el mensaje del asistente en el índice capturado)
            setMessages(currentMessages => {
              const updatedMessages = [...currentMessages];
               if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                   updatedMessages[messageIndexToUpdate] = {
                      role: 'assistant',
                      content: errorData.error || `HTTP error! status: ${response.status}`
                   };
               } else {
                   // Fallback si el índice no existe (debería existir)
                   updatedMessages.push({
                       role: 'assistant',
                       content: errorData.error || `HTTP error! status: ${response.status}`
                   });
               }
              return updatedMessages;
            });
          } catch (jsonError) {
            // Si no pudimos leer el error como JSON, mostramos un error HTTP genérico
            console.error('❌ Error HTTP no-JSON en la respuesta del backend:', response.status, jsonError);
            setMessages(currentMessages => {
              const updatedMessages = [...currentMessages];
                if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                  updatedMessages[messageIndexToUpdate] = {
                      role: 'assistant',
                      content: `HTTP error! status: ${response.status}`
                  };
                } else {
                    updatedMessages.push({
                        role: 'assistant',
                        content: `HTTP error! status: ${response.status}`
                    });
                }
              return updatedMessages;
            });
          }
          return; // Salir de la función si hay un error
      }

        // --- PROCESAR LA RESPUESTA (AHORA SOPORTA STREAMING Y NO-STREAMING) ---
        const contentType = response.headers.get('Content-Type');
        const isStreaming = contentType && contentType.includes('text/event-stream');

        if (isStreaming) {
            // --- MANEJAR RESPUESTA STREAMING (SSE) ---
            console.log("✅ Recibiendo respuesta streaming (SSE).");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = ''; // Acumula los chunks
            let assistantResponse = ''; // Acumula el contenido del asistente

            // messageIndexToUpdate ya está capturado al inicio.

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
                                    // Actualiza el mensaje del asistente en el estado con el contenido acumulado
                                    setMessages(currentMessages => {
                                        const updatedMessages = [...currentMessages];
                                        // Actualiza el mensaje del asistente en el índice correcto
                                        // Usamos messageIndexToUpdate que capturamos al inicio
                                        if (updatedMessages[messageIndexToUpdate]) { // Verificación de seguridad
                                            updatedMessages[messageIndexToUpdate] = {
                                                role: 'assistant', // Aseguramos el rol
                                                content: assistantResponse
                                            };
                                        } else {
                                             // Caso de fallback raro: si el índice no existe, añadir como nuevo mensaje
                                             console.warn("Streaming: Índice de mensaje a actualizar no encontrado, añadiendo nuevo mensaje.");
                                             return [...currentMessages, { role: 'assistant', content: assistantResponse }];
                                        }

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
                                    // Actualiza el mensaje del asistente en el índice correcto
                                    if (updatedMessages[messageIndexToUpdate]) { // Verificación de seguridad
                                         updatedMessages[messageIndexToUpdate] = {
                                             role: 'assistant', // Aseguramos el rol
                                             content: assistantResponse
                                         };
                                    } else {
                                         console.warn("Streaming: Índice de mensaje a actualizar (raw) no encontrado, añadiendo nuevo mensaje.");
                                         return [...currentMessages, { role: 'assistant', content: assistantResponse }];
                                    }
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
                 // Reemplaza el mensaje del asistente en el índice capturado con la respuesta completa
                setMessages(currentMessages => {
                     const updatedMessages = [...currentMessages];
                     if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                         updatedMessages[messageIndexToUpdate] = data.choices[0].message; // Reemplaza el placeholder
                     } else {
                          updatedMessages.push(data.choices[0].message);
                     }
                     return updatedMessages;
                });
            } else if (data.error) {
                console.error("❌ Error en la respuesta de OpenAI (no stream):", data.error);
                 // Modifica el mensaje del asistente en el índice capturado con el error
                 setMessages(currentMessages => {
                    const updatedMessages = [...currentMessages];
                    if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                         updatedMessages[messageIndexToUpdate] = {
                             role: 'assistant',
                             content: t.openaiError(data.error.code, data.error.message)
                         };
                    } else {
                         updatedMessages.push({
                             role: 'assistant',
                             content: t.openaiError(data.error.code, data.error.message)
                         });
                    }
                    return updatedMessages;
                 });
            } else {
                console.error("❌ Formato inesperado de respuesta de OpenAI (no stream):", data);
                 // Modifica el mensaje del asistente en el índice capturado con el error
                 setMessages(currentMessages => {
                    const updatedMessages = [...currentMessages];
                    if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                         updatedMessages[messageIndexToUpdate] = {
                             role: 'assistant',
                             content: t.invalidOpenAIResponse
                         };
                    } else {
                         updatedMessages.push({
                              role: 'assistant',
                              content: t.invalidOpenAIResponse
                         });
                    }
                    return updatedMessages;
                 });
            }
        }


    } catch (error) {
      console.error("❌ Error general en fetch:", error); // <-- console.error mantenido
      // Mostrar un mensaje de error general de conexión o fetch (modificando el mensaje del asistente en el índice capturado)
       setMessages(currentMessages => {
             const updatedMessages = [...currentMessages];
             if (updatedMessages[messageIndexToUpdate]) { // Usamos el índice capturado
                  updatedMessages[messageIndexToUpdate] = {
                       role: 'assistant',
                       content: t.fetchError + ' (' + error.message + ')' // Incluir mensaje del error
                  };
             } else {
                  updatedMessages.push({
                       role: 'assistant',
                       content: t.fetchError + ' (' + error.message + ')'
                  });
             }
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
            // Ya no necesitamos la referencia lastMessageRef aquí porque scrolleamos al fondo del chatBox
            <div
              key={idx}
              className={`message ${msg.role}`}
              // ref={idx === arr.length - 1 ? lastMessageRef : null} // <-- Eliminada esta línea
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