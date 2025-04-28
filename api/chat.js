import OpenAI from 'openai';

// Asegúrate de que OPENAI_API_KEY está configurada en tus variables de entorno
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Método no permitido si no es POST
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Extraemos solo lo necesario para una llamada simple
    const { messages, model = 'gpt-4-turbo', temperature = 0.7 } = req.body;

    // --- ESTE ES EL CÓDIGO PARA VOLVER A LA RESPUESTA SIMPLE DE TEXTO (NO STREAMING) ---
    // Hacemos la llamada a OpenAI SIN streaming, SIN herramientas

    console.log(" simplified backend: Making non-streaming, non-tool OpenAI call to get stable text response"); // Log para confirmación

    const response = await openai.chat.completions.create({
      model: model, // Usa el modelo del request
      messages: messages, // Pasa todo el historial de mensajes
      temperature: temperature, // Usa la temperatura

      // >>> QUITAMOS stream: true, tools, tool_choice para volver atrás <<<
      // stream: true, // <<--- Asegúrate de que esta línea NO esté
      // tools: [...], // <<--- Asegúrate de que esta propiedad NO esté
      // tool_choice: "auto", // <<--- Asegúrate de que esta propiedad NO esté
    });

    // Para respuestas no-streaming, el contenido está en response.choices[0].message
    const assistantMessage = response.choices[0].message;

    console.log(" simplified backend: Received stable non-streaming response:", assistantMessage); // Log de la respuesta recibida

    // Enviamos la respuesta completa como JSON al frontend
    // Tu frontend ya sabe manejar esto en el bloque 'else'
    res.status(200).json({
        choices: [{ message: assistantMessage }]
    });

  } catch (error) {
    // Manejo de errores en caso de que la llamada a OpenAI falle
    console.error('Error in simplified backend API route /api/chat:', error); // Log del error

    res.status(500).json({
      error: {
        code: error.code || 'internal_error',
        message: error.message || 'Ocurrió un error en el backend que no usa streaming ni herramientas.',
        type: error.type || 'api_error',
      },
    });
  }
}
