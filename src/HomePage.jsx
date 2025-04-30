import React from 'react';
import { Link } from 'react-router-dom';
const clickSound = new Audio('/sounds/button-click.mp3');

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

function HomePage() {
  return (
    <div className="homepage-container">
      <div className="language-selector">
        <Link to="/chat?lang=es"><button onClick={playClickSound}>ESPAÑOL</button></Link>
        <Link to="/chat?lang=pt"><button onClick={playClickSound}>PORTUGUÊS</button></Link>
        <Link to="/chat?lang=en"><button onClick={playClickSound}>ENGLISH</button></Link>
      </div>
    </div>
  );
}

export default HomePage;
