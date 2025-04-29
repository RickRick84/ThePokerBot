import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';
import './App.css'; // Importa los estilos CSS

// Aquí iría la lógica de tu API y cualquier estado global si no está en otro archivo.
// Asumimos que la lógica de la API está manejada por fuera de esta estructura JSX básica
// y que puedes pasar funciones o datos necesarios a los componentes de página si los separas.


function App() {
  const location = useLocation();
  // Determina si estamos en la página principal (Home)
  const isHomepage = location.pathname === '/';

  return (
    // Aplica la clase 'app' y una clase adicional ('homepage-container' o 'chat-page-container')
    // dependiendo de la ruta actual. Estas clases son clave para el CSS.
    <div className={`app ${isHomepage ? 'homepage-container' : 'chat-page-container'}`}>

      {/* Ícono/Enlace para volver a Home */}
      {/* Visible solo cuando NO estamos en la página principal */}
      {!isHomepage && (
        <Link to="/" className="home-link">
          {/* Puedes reemplazar '🏠' con un ícono de Home SVG o imagen si tienes uno */}
          🏠
        </Link>
      )}

      {/* Definición de las rutas de la aplicación */}
      <Routes>
        {/* Ruta para la Página Principal (Home) */}
        <Route path="/" element={
          <> {/* Fragmento para agrupar elementos en la ruta */}
            {/* Contenedor para el logo y los botones de selección de idioma */}
            {/* El logo ya no es una etiqueta <img> separada, es parte del fondo */}
            <div className="language-selector">
              {/* Aquí irían los elementos visuales que van DENTRO del recuadro de selección de idioma */}
              {/* Por ejemplo, el texto del logo si quieres que esté dentro del recuadro */}
               <h2>I ❤️ POKER</h2>
               <p>Ask me anything about it...</p>

              {/* Botones de selección de idioma */}
              {/* Estos botones necesitarían lógica para cambiar de idioma o navegar a la página de chat */}
              {/* Por ahora, son solo placeholders con un console.log */}
              <button onClick={() => console.log('Español seleccionado')}>ESPAÑOL</button>
              <button onClick={() => console.log('Português seleccionado')}>PORTUGUÊS</button>
              <button onClick={() => console.log('English seleccionado')}>ENGLISH</button>
            </div>
          </>
        } />

        {/* Ruta para la Página de Chat */}
        {/* Aquí es donde integrarías tu lógica de API y chat */}
        <Route path="/chat" element={
          <> {/* Fragmento para agrupar elementos */}
            {/* Contenedor para el título/logo en la página de chat (si es diferente al fondo general) */}
             <div className="title-container">
                 {/* Si necesitas un título o logo específico visible aquí (no solo el fondo), agrégalo */}
                 {/* Por ejemplo: <h1>Chat de I ❤️ POKER</h1> */}
             </div>

            {/* Contenedor principal de la caja de chat donde aparecen los mensajes */}
            <div className="chat-box">
              {/* AQUÍ ES DONDE TU LÓGICA DE LA API DE CHAT RENDERIZARÍA LOS MENSAJES */}
              {/* Los mensajes individuales tendrían la clase "message", "user", "assistant" */}
              {/* Ejemplo de estructura de mensaje: */}
              {/* <div className="message user"><span>Hola!</span></div> */}
              {/* <div className="message assistant"><span>Hola! ¿Cómo puedo ayudarte?</span></div> */}
            </div>

            {/* Contenedor para la barra de entrada de texto y el botón de enviar */}
            <div className="input-bar">
              {/* AQUÍ IRÍA TU INPUT DE TEXTO CONECTADO A LA LÓGICA DE LA API */}
              <input type="text" placeholder="Escribe tu mensaje..." />
              {/* AQUÍ IRÍA TU BOTÓN DE ENVIAR CONECTADO A LA LÓGICA DE LA API */}
              <button>Enviar</button>
            </div>
          </>
        } />

        {/* Ruta de respaldo para páginas no encontradas (opcional) */}
        {/* <Route path="*" element={<div>Página no encontrada</div>} /> */}
      </Routes>
    </div>
  );
}

export default App;