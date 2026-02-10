import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Event {
  id?: number;
  _id?: string;
  name: string;
  code: string;
  date: string;
  photo_count?: number;
}

interface FormData {
  name: string;
  code: string;
  date: string;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const API_BASE = 'http://localhost:8000/api/v1';

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        let res = await axios.get(`${API_BASE}/events/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let eventsList = Array.isArray(res.data) ? res.data : res.data.events || [];
        setEvents(eventsList);
      } catch (error) {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des événements' });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadEvents();
    }
  }, [token]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.name || !formData.code || !formData.date) {
      setMessage({ type: 'error', text: 'Tous les champs sont obligatoires' });
      return;
    }

    try {
      if (editingId) {
        // Update
        await axios.put(`${API_BASE}/events/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ type: 'success', text: 'Événement mis à jour avec succès' });
      } else {
        // Create
        await axios.post(`${API_BASE}/events/`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ type: 'success', text: 'Événement créé avec succès' });
      }

      // Reset form
      setFormData({
        name: '',
        code: '',
        date: new Date().toISOString().split('T')[0],
      });
      setEditingId(null);

      // Reload events
      const res = await axios.get(`${API_BASE}/events/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let eventsList = Array.isArray(res.data) ? res.data : res.data.events || [];
      setEvents(eventsList);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de la sauvegarde',
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id || event._id || null);
    setFormData({
      name: event.name,
      code: event.code,
      date: event.date,
    });
  };

  const handleDelete = async (id: string | number | undefined) => {
    if (!id || !window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      await axios.delete(`${API_BASE}/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({ type: 'success', text: 'Événement supprimé avec succès' });

      // Reload events
      const res = await axios.get(`${API_BASE}/events/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let eventsList = Array.isArray(res.data) ? res.data : res.data.events || [];
      setEvents(eventsList);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de la suppression',
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  if (!token) {
    return <div className="p-6">⚠️ Authentification requise</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">🎉 Gestion des événements</h2>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 px-6 py-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            {editingId ? '✏️ Modifier l\'événement' : '➕ Créer un nouvel événement'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="event-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l&apos;événement *
                </label>
                <input
                  id="event-name"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Mariage"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  id="event-date"
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-code" className="block text-sm font-medium text-gray-700 mb-2">
                Code d&apos;événement *
              </label>
              <div className="flex gap-3">
                <input
                  id="event-code"
                  type="text"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Code généré automatiquement"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                  onClick={generateCode}
                >
                  🔄 Générer
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {editingId ? '💾 Mettre à jour' : '✨ Créer'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
                  onClick={handleCancel}
                >
                  ✕ Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">📋 Tous les événements ({events.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">Chargement des événements...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>Aucun événement pour le moment. Créez-en un pour commencer !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {events.map((event) => (
                <div
                  key={event.id || event._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                >
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-2">{event.name}</h4>
                    <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {event.code}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    📅 {new Date(event.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    📷 {event.photo_count || 0} photos
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded text-sm transition"
                      onClick={() => navigate('/admin/photos')}
                    >
                      📷 Photos
                    </button>
                    <button
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-3 rounded text-sm transition"
                      onClick={() => handleEdit(event)}
                    >
                      ✏️ Éditer
                    </button>
                    <button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded text-sm transition"
                      onClick={() => handleDelete(event.id || event._id)}
                    >
                      🗑️ Suppr.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
