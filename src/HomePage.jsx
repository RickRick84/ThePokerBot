import React from 'react';
import { useNavigate } from 'react-router-dom'; // Hook para navegar entre rutas
import './App.css'; // Importamos el CSS principal para reutilizar estilos como el background y .app

function HomePage() {
  const navigate = useNavigate(); // Obtenemos la función para navegar

  // Función que se llama al hacer click en un botón de idioma
  const handleLanguageSelect = (lang) => {
    localStorage.setItem('pokerBotLang', lang); // Guardamos el idioma elegido en el almacenamiento local
    navigate(`/chat/${lang}`); // Navegamos a la ruta del chat, incluyendo el idioma en la URL
  };

  return ( // <-- Aquí empieza el return con (
    // Asegúrate de que aquí sigue la clase 'homepage-app'
    <div className="app homepage-app"> {/* <-- Asegúrate de tener ambas clases aquí */}
      {/* Reutilizamos la estructura y estilos para el logo */}
      <div className="title-container">
        <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" />
      </div> {/* <-- Cierre correcto de title-container */}

      {/* Contenedor para los botones de selección de idioma */}
      <div className="language-selector">
        {/* --- ELIMINADO: Quitamos el título "Selecciona tu idioma" --- */}
        {/* <h2>Selecciona tu idioma</h2> */}
        {/* --- FIN ELIMINADO --- */}
        {/* Botones para cada idioma */}
        <button onClick={() => handleLanguageSelect('es')}>ESPAÑOL</button>
        <button onClick={() => handleLanguageSelect('pt')}>PORTUGUÊS</button>
        <button onClick={() => handleLanguageSelect('en')}>ENGLISH</button>
      </div> {/* <-- Cierre correcto de language-selector */}

      {/* Removed the spacing div previously */}

    </div> // <-- Cierre correcto del div.app homepage-app
  ); // <-- ¡Aquí el paréntesis de cierre del return!
}

export default HomePage; // Exportamos el componente