import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="homepage-container">
      <div className="language-selector">
        <Link to="/chat?lang=es"><button>ESPAÑOL</button></Link>
        <Link to="/chat?lang=pt"><button>PORTUGUÊS</button></Link>
        <Link to="/chat?lang=en"><button>ENGLISH</button></Link>
      </div>
    </div>
  );
}

export default HomePage;
