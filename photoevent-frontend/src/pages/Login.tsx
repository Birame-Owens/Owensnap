import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [eventId, setEventId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/v1/auth/login', {
        username,
        password,
        event_id: "temp"  // Valeur temporaire, sera changée au Kiosk/Dashboard
      })

      // Sauvegarder le token dans localStorage
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('username', username)

      // Rediriger vers le dashboard
      navigate('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">💎 Owen'Snap</h1>
          <p className="login-subtitle">Espace Photographe</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Identifiant</label>
            <input
              id="username"
              type="text"
              placeholder="photographer ou admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {error && <div className="error-message">❌ {error}</div>}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? '⏳ Connexion...' : '🔐 Se connecter'}
          </button>
        </form>

        <div className="test-credentials">
          <p className="credentials-title">📝 Identifiants de test:</p>
          <div className="credential-item">
            <strong>Photographe:</strong> photographer / photo123
          </div>
          <div className="credential-item">
            <strong>Admin:</strong> admin / admin123
          </div>
        </div>

        <div className="login-footer">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-back"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
