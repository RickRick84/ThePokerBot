import React, { useRef } from 'react'; // Importamos useRef
import { useNavigate } from 'react-router-dom'; // Hook para navegar entre rutas
import './App.css'; // Importamos el CSS principal

function HomePage() {
  const navigate = useNavigate(); // Obtenemos la función para navegar

  // Creamos una referencia a un objeto de Audio.
  // La ruta es relativa a la carpeta 'public'.
  const audioRef = useRef(new Audio('/sounds/button-click.mp3')); // <-- Asegúrate que esta ruta y nombre de archivo sean correctos

  // Función para reproducir el sonido
  const playSound = () => {
    // Reinicia el sonido al principio cada vez que se llama, para que se pueda reproducir rápido
    audioRef.current.currentTime = 0;
    // Intenta reproducir el sonido y captura cualquier posible error (por ejemplo, si el navegador lo bloquea)
    audioRef.current.play().catch(error => console.error("Error playing sound:", error));
  };


  // Función que se llama al hacer click en un botón de idioma
  const handleLanguageSelect = (lang) => {
    playSound(); // <-- Reproducimos el sonido ANTES de navegar
    localStorage.setItem('pokerBotLang', lang); // Guardamos el idioma elegido
    navigate(`/chat/${lang}`); // Navegamos a la ruta del chat
  };

  return (
    // Asegúrate de que aquí sigue la clase 'homepage-app' - Nota: en tu App.css se usa .app.homepage-container
    <div className="app homepage-container"> {/* Usamos .app y .homepage-container consistentemente con CSS */}
      {/* Reutilizamos la estructura y estilos para el título, pero eliminamos la etiqueta img del logo */}
      <div className="title-container">
        {/* La imagen del logo ahora está en el background-image del body */}
        {/* <img src="/i_love_poker_logo_.png" alt="The Poker Bot Logo" className="title-image" /> */} {/* ELIMINADO */}
        {/* Si necesitas algún texto de título, iría aquí dentro de title-container */}
      </div>

      {/* Contenedor para los botones de selección de idioma */}
      <div className="language-selector">
        {/* Botones para cada idioma - Ahora llaman a handleLanguageSelect que reproduce el sonido */}
        <button onClick={() => handleLanguageSelect('es')}>ESPAÑOL</button>
        <button onClick={() => handleLanguageSelect('pt')}>PORTUGUÊS</button>
        <button onClick={() => handleLanguageSelect('en')}>ENGLISH</button>
      </div>
    </div>
  );
}

export default HomePage; // Exportamos el componente