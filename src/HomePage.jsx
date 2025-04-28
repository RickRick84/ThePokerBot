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

  return (
    // Asegúrate de que aquí sigue la clase 'homepage-app'
    <div className="app homepage-app"> {/* <-- Asegúrate de tener ambas clases aquí */}
      {/* Reutilizamos la estructura y estilos para el logo */}
      <div className="title-container">
        <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" />
      </div>

      {/* Contenedor para los botones de selección de idioma */}
      <div className="language-selector">
        <h2>Selecciona tu idioma</h2>
        {/* Botones para cada idioma */}
        <button onClick={() => handleLanguageSelect('es')}>ESPAÑOL</button>
        <button onClick={() => handleLanguageSelect('pt')}>PORTUGUÊS</button>
        <button onClick={() => handleLanguageSelect('en')}>ENGLISH</button>
      </div>

      {/* --- ELIMINADO: Quitamos el div de espacio que podría causar problemas de layout --- */}
      {/* <div style={{ height: '650px', marginTop: '0.8rem', maxWidth: '540px', width: '100%' }}> */}
         {/* Puedes ajustar el 'height' aquí para que visualmente se alinee mejor */}
      {/* </div> */}
      {/* --- FIN ELIMINADO --- */}

    </div>
  );
}

export default HomePage; // Exportamos el componente