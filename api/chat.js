import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (e) {
    console.error("Error parsing request body:", e); // <-- console.error mantenido
    return new Response(JSON.stringify({ error: "Invalid request body: Must be JSON." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, model = 'gpt-4-turbo', temperature = 0.7 } = requestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Bad Request: Messages are required and must be an array.', { status: 400 });
    }

    const isValidMessages = messages.every(msg =>
        typeof msg === 'object' && msg !== null && typeof msg.role === 'string' && typeof msg.content === 'string'
    );

    if (!isValidMessages) {
         return new Response('Bad Request: Invalid message format in messages array.', { status: 400 });
    }

    // console.log("Received messages for function calling:", messages); // <-- console.log eliminado

    const tools = [
      {
        type: "function",
        function: {
          name: "search_web",
          description: "Busca información actual en la web sobre póker u otros temas cuando la información de entrenamiento del modelo no es suficiente.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "El término o pregunta a buscar en la web (ej. 'ganador WSOP 2024', 'últimas noticias poker').",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    let initialResponseResult = null;

    try {
        // --- Primera llamada a OpenAI: con la pregunta del usuario y las herramientas disponibles ---
        initialResponseResult = await openai.chat.completions.create({
          model: model,
          // --- ¡Aquí es donde agregamos el mensaje del sistema! ---
          messages: [
              { role: 'system', content: 'Eres un asistente experto en póker que responde en español. Tienes acceso a una herramienta de búsqueda web para obtener información actual sobre torneos, jugadores, resultados y noticias del mundo del póker. Siempre que una pregunta requiera información más allá de tu conocimiento de entrenamiento, utiliza la herramienta de búsqueda antes de responder. Si te preguntan algo no relacionado con el póker, responde amablemente que solo puedes ayudar con temas de póker.' },
              ...messages // Desestructuramos el array 'messages' que viene del frontend
          ],
          // --- Fin Adición del Mensaje del Sistema ---
          tools: tools,
          tool_choice: "auto",
          stream: false, // ¡Importante! Primera llamada NO es stream.
        });

         if (!initialResponseResult || !initialResponseResult.choices || initialResponseResult.choices.length === 0 || !initialResponseResult.choices[0].message) {
             throw new Error("Unexpected or empty format from OpenAI initial response.");
         }

    } catch (firstCallError) {
         console.error('Error in first OpenAI call (function calling decision):', firstCallError); // <-- console.error mantenido
         let errorMsg = "Error en la primera llamada a OpenAI para decidir herramienta.";
         if (firstCallError.response) {
             errorMsg += ` Status: ${firstCallError.response.status}`;
              if (firstCallError.response.data) errorMsg += ` Data: ${JSON.stringify(firstCallError.response.data)}`;
         } else if (firstCallError.message) {
             errorMsg += ` Message: ${firstCallError.message}`;
         }
          return new Response(JSON.stringify({ error: errorMsg }), {
              status: firstCallError.status || 500,
              headers: { 'Content-Type': 'application/json' },
          });
    }

    const responseMessage = initialResponseResult.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const firstToolCall = toolCalls[0];
      if (firstToolCall.function.name === "search_web") {
        let functionArgs = {};
        try {
            functionArgs = JSON.parse(firstToolCall.function.arguments);
             if (typeof functionArgs.query !== 'string') {
                 throw new Error("Invalid query format from OpenAI tool arguments.");
             }
        } catch (e) {
            console.error("Error parsing tool call arguments:", e); // <-- console.error mantenido
            return new Response(JSON.stringify({ error: `Error procesando argumentos de la función de búsqueda: ${e.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const searchQuery = functionArgs.query;

        // console.log(`🤖 Modelo decidió llamar a search_web con query: "${searchQuery}"`); // <-- console.log eliminado

        // --- AQUÍ IRÍA LA LÓGICA REAL DE BÚSQUEDA WEB ---
        const simulatedSearchResults = `[Resultados de búsqueda para "${searchQuery}"]: El ganador de la WSOP Main Event 2024 fue John Smith. Otros resultados recientes relevantes para poker: ...`;
        // console.log("🔍 Simulando resultados de búsqueda:", simulatedSearchResults); // <-- console.log eliminado
        // --- FIN SIMULACIÓN ---


        // --- Segunda llamada a OpenAI: con los resultados de la búsqueda como contexto ---
        const messagesWithToolResults = [
          ...messages,
          responseMessage,
          {
            role: "tool",
            tool_call_id: firstToolCall.id,
            content: simulatedSearchResults,
          },
        ];

        // >>> TODOS LOS console.log DE ESTA SECCIÓN HAN SIDO ELIMINADOS <<<

        // >>> ESTE ES EL BLOQUE TRY QUE DEBE CONTENER LA LÓGICA DE PIPEO <<<
        try {
             const finalResponseStream = await openai.chat.completions.create({
               model: model,
               messages: messagesWithToolResults,
               stream: true, // ¡Importante! Segunda llamada SÍ es stream.
             });

             // --- AJUSTE CRUCIAL: Procesar el stream de OpenAI y pipearlo a un nuevo ReadableStream compatible con Vercel Edge ---
             // El error ERR_INVALID_ARG_TYPE ocurre porque el objeto stream de la librería OpenAI
             // no es directamente compatible con el constructor de Response en Vercel Edge en todos los casos.
             const readableStream = new ReadableStream({
               async start(controller) {
                 const reader = finalResponseStream.toReadableStream ? finalResponseStream.toReadableStream().getReader() : finalResponseStream.getReader();

                 try {
                   while (true) {
                     const { done, value } = await reader.read();
                     if (done) {
                       break;
                     }
                     controller.enqueue(value);
                   }
                 } catch (error) {
                   console.error("Error reading or piping OpenAI stream:", error); // <-- console.error mantenido
                   controller.error(error);
                 } finally {
                   controller.close();
                   reader.releaseLock();
                 }
               }
             });

             // Devolver una nueva Response con el ReadableStream como cuerpo y headers correctos para SSE
             return new Response(readableStream, {
               headers: {
                 'Content-Type': 'text/event-stream',
                 'Cache-Control': 'no-cache',
                 'Connection': 'keep-alive',
               },
             });

        } catch (secondCallError) {
             console.error('Error in second OpenAI call (with tool results):', secondCallError); // <-- console.error mantenido
             let errorMsg = "Error en la segunda llamada a OpenAI con resultados de búsqueda.";
             if (secondCallError.response) {
                 errorMsg += ` Status: ${secondCallError.response.status}`;
                 if (secondCallError.response.data) {
                    try { errorMsg += ` Data: ${JSON.stringify(secondCallError.response.data)}`; } catch(e) { /* ignore */ }
                 }
             } else if (secondCallError.message) {
                 errorMsg += ` Message: ${secondCallError.message}`;
             }
              return new Response(JSON.stringify({ error: errorMsg }), {
                  status: secondCallError.status || 500,
                  headers: { 'Content-Type': 'application/json' },
              });
        }

      } else {
           const errorResponse = new Response(JSON.stringify({ error: `Modelo intentó usar una herramienta desconocida: ${firstToolCall.function.name}` }), {
               status: 500,
               headers: { 'Content-Type': 'application/json' },
           });
           console.error(errorResponse.body); // <-- console.error mantenido
           return errorResponse;
      }

    } else {
        // --- Si OpenAI NO decidió llamar a una herramienta, la primera respuesta es la final ---
        // console.log("🤖 Modelo no llamó a herramienta, enviando respuesta directa (no stream)."); // <-- console.log eliminado

         const finalData = {
             choices: [{ message: responseMessage, index: 0, finish_reason: 'stop' }],
             model: initialResponseResult.model,
             id: initialResponseResult.id,
         };

         return new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
         });
    }

  } catch (error) {
    console.error('Error general durante la interacción con OpenAI (Function Calling):', error); // <-- console.error mantenido

    let errorMessage = 'Ocurrió un error general al procesar la solicitud con la API.';
    let statusCode = 500;

    if (error.response) {
      errorMessage = `Error de la API de OpenAI: ${error.response.status}`;
       if (error.response.data) {
           errorMessage += ` - ${JSON.stringify(error.response.data)}`;
       }
      statusCode = error.response.status;
    } else if (error.message) {
      errorMessage = `Error de solicitud: ${error.message}`;
      statusCode = 500;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
