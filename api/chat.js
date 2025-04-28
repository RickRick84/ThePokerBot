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
        const functionArgs = JSON.parse(firstToolCall.function.arguments);
        const searchQuery = functionArgs.query;

        console.log(`🤖 Modelo decidió llamar a search_web con query: "${searchQuery}"`);

        // --- AQUÍ IRÍA LA LÓGICA REAL DE BÚSQUEDA WEB ---
        // POR AHORA, SIMULAMOS EL RESULTADO
        const simulatedSearchResults = `[Resultados de búsqueda para "${searchQuery}"]: El ganador de la WSOP Main Event 2024 fue John Smith. Otros resultados recientes...`;
        console.log("🔍 Simulando resultados de búsqueda:", simulatedSearchResults);
        // --- FIN SIMULACIÓN ---


        // --- Segunda llamada a OpenAI: con los resultados de la búsqueda como contexto ---
        const messagesWithToolResults = [
          ...messages, // Conservar el historial
          responseMessage, // Añadir el mensaje original de OpenAI que indicaba la llamada a la herramienta
          {
            role: "tool", // <-- Rol 'tool' para los resultados de la herramienta
            tool_call_id: firstToolCall.id, // ID de la llamada original a la herramienta
            content: simulatedSearchResults, // <-- Aquí van los resultados de la búsqueda real
          },
        ];

        console.log("🔄 Re-enviando a OpenAI con resultados de búsqueda...");

        // --- Ahora sí, la segunda llamada puede ser un stream para la respuesta final ---
        const finalResponseStream = await openai.chat.completions.create({
          model: model,
          messages: messagesWithToolResults,
          stream: true, // <--- La respuesta final SÍ puede ser un stream
        });

        // Devolver el stream de la respuesta final al cliente
        return new Response(finalResponseStream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });

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
        // En este caso, la respuesta inicial de OpenAI es la respuesta final del chat.
        // Si queremos que esta respuesta TAMBIÉN sea un stream, debemos hacer una segunda llamada aquí con stream: true.
        // O podríamos haber puesto stream: true en la primera llamada y manejar las tool_calls de forma diferente (más complejo).
        // Por simplicidad ahora, si no hay llamada a herramienta, la respuesta es la inicial (NO stream)
         console.log("🤖 Modelo no llamó a herramienta, enviando respuesta directa.");

         // Opcional: si quieres que incluso las respuestas sin herramientas sean stream, haz otra llamada aquí:
         /*
         const finalResponseStream = await openai.chat.completions.create({
             model: model, messages: messages, stream: true,
         });
         return new Response(finalResponseStream, { headers: { 'Content-Type': 'text/event-stream' } });
         */

        // O, simplemente devolvemos la respuesta completa inicial (no stream)
         return new Response(JSON.stringify(initialResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
         });
    }

  } catch (error) {
    console.error('Error during OpenAI interaction (function calling):', error);

    let errorMessage = 'An error occurred during the API interaction.';
    let statusCode = 500;

    if (error.response) {
      errorMessage = `OpenAI API error: ${error.response.status} - ${error.response.statusText}`;
      statusCode = error.response.status;
       if (error.response.data) {
           console.error('OpenAI response data:', error.response.data);
           errorMessage += `: ${JSON.stringify(error.response.data)}`;
       }
    } else if (error.message) {
      errorMessage = `Request error: ${error.message}`;
      statusCode = 500;
    }


    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}




