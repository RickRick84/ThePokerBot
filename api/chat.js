import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let requestBody;
  try {
    // Intentar parsear el body de la solicitud como JSON
    requestBody = await req.json();
  } catch (e) {
    console.error("Error parsing request body:", e);
    // Devolver un error si el body no es JSON válido
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

    // Validar estructura básica de los mensajes para evitar errores posteriores
    const isValidMessages = messages.every(msg =>
        typeof msg === 'object' && msg !== null && typeof msg.role === 'string' && typeof msg.content === 'string'
    );

    if (!isValidMessages) {
         return new Response('Bad Request: Invalid message format in messages array.', { status: 400 });
    }


    console.log("Received messages for function calling:", messages);

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

    let responseMessage;
    let toolCalls;

    try {
        // --- Primera llamada a OpenAI: con la pregunta del usuario y las herramientas disponibles ---
        const initialResponse = await openai.chat.completions.create({
          model: model,
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          stream: false,
        });
         // Asegurarse de que la respuesta tiene el formato esperado
         if (!initialResponse || !initialResponse.choices || initialResponse.choices.length === 0) {
             throw new Error("Unexpected format from OpenAI initial response.");
         }

        responseMessage = initialResponse.choices[0].message;
        toolCalls = responseMessage.tool_calls;

    } catch (firstCallError) {
         console.error('Error in first OpenAI call (function calling decision):', firstCallError);
         // Si la primera llamada falla, devolvemos un error
         let errorMsg = "Error en la primera llamada a OpenAI para decidir herramienta.";
         if (firstCallError.response) {
             errorMsg += ` Status: ${firstCallError.response.status}`;
              if (firstCallError.response.data) errorMsg += ` Data: ${JSON.stringify(firstCallError.response.data)}`;
         } else if (firstCallError.message) {
             errorMsg += ` Message: ${firstCallError.message}`;
         }
          return new Response(JSON.stringify({ error: errorMsg }), {
              status: firstCallError.status || 500, // Usar el status de la respuesta de OpenAI si está disponible
              headers: { 'Content-Type': 'application/json' },
          });
    }


    // --- Verificar si OpenAI decidió llamar a una herramienta ---
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
            console.error("Error parsing tool call arguments:", e);
            // Enviar un error específico si los argumentos no se parsean
            return new Response(JSON.stringify({ error: `Error procesando argumentos de la función de búsqueda: ${e.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const searchQuery = functionArgs.query;

        console.log(`🤖 Modelo decidió llamar a search_web con query: "${searchQuery}"`);

        // --- AQUÍ IRÍA LA LÓGICA REAL DE BÚSQUEDA WEB ---
        const simulatedSearchResults = `[Resultados de búsqueda para "${searchQuery}"]: El ganador de la WSOP Main Event 2024 fue John Smith. Otros resultados recientes relevantes para poker: ...`;
        console.log("🔍 Simulando resultados de búsqueda:", simulatedSearchResults);
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

        console.log("🔄 Re-enviando a OpenAI con resultados de búsqueda...");

        try {
             const finalResponseStream = await openai.chat.completions.create({
               model: model,
               messages: messagesWithToolResults,
               stream: true, // <--- La respuesta final SÍ puede ser un stream
             });

             // Devolver el stream de la respuesta final al cliente
             return new Response(finalResponseStream, {
               headers: { 'Content-Type': 'text/event-stream' },
             });

        } catch (secondCallError) {
             console.error('Error in second OpenAI call (with tool results):', secondCallError);
             // Enviar un error específico si falla la segunda llamada
             let errorMsg = "Error en la segunda llamada a OpenAI con resultados de búsqueda.";
             if (secondCallError.response) {
                 errorMsg += ` Status: ${secondCallError.response.status}`;
                 if (secondCallError.response.data) errorMsg += ` Data: ${JSON.stringify(secondCallError.response.data)}`;
             } else if (secondCallError.message) {
                 errorMsg += ` Message: ${secondCallError.message}`;
             }
              return new Response(JSON.stringify({ error: errorMsg }), {
                  status: secondCallError.status || 500, // Usar el status de la respuesta de OpenAI si está disponible
                  headers: { 'Content-Type': 'application/json' },
              });
        }


      } else {
           const errorResponse = new Response(JSON.stringify({ error: `Modelo intentó usar una herramienta desconocida: ${firstToolCall.function.name}` }), {
               status: 500,
               headers: { 'Content-Type': 'application/json' },
           });
           console.error(errorResponse.body);
           return errorResponse;
      }

    } else {
        // --- Si OpenAI NO decidió llamar a una herramienta, la primera respuesta es la final ---
        console.log("🤖 Modelo no llamó a herramienta, enviando respuesta directa (no stream).");

         const finalData = {
             choices: [{ message: responseMessage, index: 0, finish_reason: 'stop' }],
             model: initialResponse.model,
             id: initialResponse.id,
         };

         // Devolvemos una respuesta JSON (no stream) que el frontend pueda manejar como si fuera un stream terminado
         return new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }, // Importante: Aquí es application/json
         });
    }

  } catch (error) {
    console.error('Error general durante la interacción con OpenAI (Function Calling):', error);

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

    // Devolver una respuesta JSON con el error
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}




