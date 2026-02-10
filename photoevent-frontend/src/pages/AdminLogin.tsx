import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LoginError {
  message: string;
}

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/api/v1/auth/admin-login', {
        username: username,
        password: password,
      });

      // Save token and admin info to localStorage
      localStorage.setItem('admin_token', res.data.access_token);
      localStorage.setItem('admin_id', res.data.admin_id);
      localStorage.setItem('admin_name', res.data.admin_name);

      // Redirect to dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError({
        message: err.response?.data?.detail || 'Erreur de connexion. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h1>
            <p className="text-gray-600 text-sm">Owen&apos;Snap Administration</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error.message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                type="text"
                placeholder="Entrez votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!username || !password || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Connexion en cours...' : 'Connexion'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              ← Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
