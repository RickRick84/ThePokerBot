import OpenAI from 'openai';

// Esto es necesario para que Vercel sepa que debe esperar un stream (para respuestas finales)
export const config = {
  runtime: 'edge', // 'edge' runtime is generally better for streaming
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, model = 'gpt-4-turbo', temperature = 0.7 } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Bad Request: Messages are required', { status: 400 });
    }

    console.log("Received messages for function calling:", messages);

    // --- Definición de las herramientas disponibles ---
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
      // Puedes definir más herramientas aquí si las necesitas en el futuro
    ];
    // --- Fin Definición de Herramientas ---


    // --- Primera llamada a OpenAI: con la pregunta del usuario y las herramientas disponibles ---
    const initialResponse = await openai.chat.completions.create({
      model: model,
      messages: messages,
      tools: tools, // <--- ¡Le decimos a OpenAI qué herramientas tiene!
      tool_choice: "auto", // Permite a OpenAI decidir automáticamente si usar una herramienta
      stream: false, // <--- Importante: La primera llamada NO es un stream, esperamos la decisión de la herramienta
    });

    const responseMessage = initialResponse.choices[0].message;

    // --- Verificar si OpenAI decidió llamar a una herramienta ---
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const firstToolCall = toolCalls[0]; // Para simplificar, solo manejamos la primera llamada de herramienta
      if (firstToolCall.function.name === "search_web") {
        // Asegurarse de que functionArgs es un objeto válido antes de acceder a .query
        let functionArgs = {};
        try {
            functionArgs = JSON.parse(firstToolCall.function.arguments);
        } catch (e) {
            console.error("Error parsing tool call arguments:", e);
            // Enviar un error específico si los argumentos no se parsean
            return new Response(JSON.stringify({ error: "Error procesando argumentos de la función de búsqueda." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const searchQuery = functionArgs.query;

        console.log(`🤖 Modelo decidió llamar a search_web con query: "${searchQuery}"`);

        // --- AQUÍ IRÍA LA LÓGICA REAL DE BÚSQUEDA WEB ---
        // POR AHORA, SIMULAMOS EL RESULTADO
        // Asegúrate que esta simulación tiene el formato que OpenAI espera de una herramienta
        const simulatedSearchResults = `[Resultados de búsqueda para "${searchQuery}"]: El ganador de la WSOP Main Event 2024 fue John Smith. Otros resultados recientes relevantes para poker: ...`;
        console.log("🔍 Simulando resultados de búsqueda:", simulatedSearchResults);
        // --- FIN SIMULACIÓN ---


        // --- Segunda llamada a OpenAI: con los resultados de la búsqueda como contexto ---
        const messagesWithToolResults = [
          ...messages, // Conservar el historial
          responseMessage, // Añadir el mensaje original de OpenAI que indicaba la llamada a la herramienta
          {
            role: "tool", // <-- Rol 'tool' para los resultados de la herramienta
            tool_call_id: firstToolCall.id, // ID de la llamada original a la herramienta
            content: simulatedSearchResults, // <-- Aquí van los resultados de la búsqueda real o simulada
          },
        ];

        console.log("🔄 Re-enviando a OpenAI con resultados de búsqueda...");

        // --- Ahora sí, la segunda llamada puede ser un stream para la respuesta final ---
        // Usamos un bloque try-catch para esta segunda llamada también
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
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
              });
        }


      } else {
          // Si OpenAI llama a una herramienta que no reconocemos (no debería pasar con tool_choice="auto" y solo una herramienta)
           const errorResponse = new Response(JSON.stringify({ error: `Modelo intentó usar una herramienta desconocida: ${firstToolCall.function.name}` }), {
               status: 500,
               headers: { 'Content-Type': 'application/json' },
           });
           console.error(errorResponse.body);
           return errorResponse;
      }

    } else {
        // --- Si OpenAI NO decidió llamar a una herramienta, la primera respuesta es la final ---
        // Esta respuesta inicial de OpenAI es la respuesta final del chat (no stream)
        console.log("🤖 Modelo no llamó a herramienta, enviando respuesta directa (no stream).");

        // Convertimos la respuesta inicial (no stream) a un formato compatible con el frontend streaming logic (aunque sea un solo chunk)
         const finalData = {
             choices: [{ message: responseMessage, index: 0, finish_reason: 'stop' }],
             model: initialResponse.model, // Incluir el modelo si está disponible
             id: initialResponse.id, // Incluir ID si está disponible
             // Otros campos relevantes si los hay
         };


         // Devolvemos una respuesta JSON (no stream) que el frontend pueda manejar como si fuera un stream terminado
         return new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }, // Importante: Aquí es application/json, no text/event-stream
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




