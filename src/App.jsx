const sendMessage = async () => {
  if (!input.trim()) return;

  const newMessages = [...messages, { role: 'user', content: input }];
  setMessages(newMessages);
  setInput('');
  setLoading(true);

  try {
    // Cambia la URL a una ruta relativa
    const url = '/api/chat';
    console.log("Usando backend:", url); // Mensaje más general

    const payload = {
      model: 'gpt-4-turbo',
      messages: newMessages,
      temperature: 0.7,
    };

    console.log("📤 Enviando a backend:", payload);

    const response = await fetch(url, { // Usa la variable url o '/api/chat' directamente
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message;
      setMessages([...newMessages, reply]);
    } else if (data.error) {
      console.error("❌ Error en la respuesta de OpenAI:", data.error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error de OpenAI: ${data.error.code || 'Código desconocido'} - ${data.error.message || 'Error desconocido'}`
      }]);
    } else {
      console.error("❌ Formato inesperado de respuesta de OpenAI:", data);
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'No se pudo obtener una respuesta válida de OpenAI.'
      }]);
    }
  } catch (error) {
    console.error("❌ Error en fetch:", error);
    setMessages([...newMessages, {
      role: 'assistant',
      content: 'Ocurrió un error al conectarse con la API.' // Mensaje más general
    }]);
  } finally {
    setLoading(false);
  }
};


