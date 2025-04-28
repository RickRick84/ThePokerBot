import React, { useEffect } from 'react'; // Importamos useEffect si quieres recordar el idioma
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './HomePage'; // Importamos el nuevo componente HomePage
import ChatPage from './ChatPage'; // Importamos el componente ChatPage (antes App)

function App() {
    // Efecto para recordar el idioma y redirigir en visitas futuras
    useEffect(() => {
        const savedLang = localStorage.getItem('pokerBotLang');
        if (savedLang) {
            // Si hay un idioma guardado, redirige a la ruta del chat con ese idioma
            // Esto se hace con JavaScript después de que la app carga
            // Puedes usar window.location.href o useNavigate si fuera un componente dentro de Router
            // Para la redirección inicial, useEffect y Route/Navigate son una buena combinación
        }
    }, []); // El array vacío asegura que esto se ejecute solo una vez al montar


    return (
        // BrowserRouter envuelve toda la aplicación para habilitar el enrutamiento
        <Router>
            {/* Routes define las rutas disponibles */}
            <Routes>
                {/* Ruta para la página de inicio */}
                <Route path="/" element={<HomePage />} />

                {/* Ruta para la página de chat con un parámetro de idioma (:lang) */}
                <Route path="/chat/:lang" element={<ChatPage />} />

                {/* Ruta de fallback: si alguien va a /chat sin idioma, lo enviamos a inicio */}
                <Route path="/chat" element={<Navigate to="/" replace />} />

                {/* Ruta de fallback: si alguien va a cualquier otra ruta, lo enviamos a inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App; // Exportamos App como el componente principal (el Router)