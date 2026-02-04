import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <div className="home-container">
        <h1 className="home-title">💎 Owen'Snap</h1>
        <p className="subtitle">Reconnaissance faciale pour retrouver vos photos</p>
        
        <div className="home-cards">
          <div className="home-card photographer-card" onClick={() => navigate('/login')}>
            <div className="card-icon">📸</div>
            <h2>Espace Photographe</h2>
            <p>Gérer vos événements et uploader vos photos</p>
            <button className="card-button">Accéder</button>
          </div>

          <div className="home-card guest-card" onClick={() => navigate('/kiosk')}>
            <div className="card-icon">🔍</div>
            <h2>Retrouver Mes Photos</h2>
            <p>Cherchez et téléchargez vos photos en direct</p>
            <button className="card-button">Accéder</button>
          </div>
        </div>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <h3>Ultra rapide</h3>
            <p>Reconnaissance instantanée en quelques secondes</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <h3>Très précis</h3>
            <p>95% de taux de reconnaissance en temps réel</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📱</span>
            <h3>Responsive</h3>
            <p>Fonctionne sur tous les appareils et écrans</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
