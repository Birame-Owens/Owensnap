import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DashboardStats {
  total_events: number;
  total_photos: number;
  total_storage_mb: number;
  events_today: number;
}

interface Event {
  id?: number;
  _id?: string;
  name: string;
  code: string;
  date: string;
  photo_count?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const adminName = localStorage.getItem('admin_name') || 'Admin';

  const API_BASE = 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const loadDashboardData = async () => {
      try {
        // Load stats
        const statsRes = await axios.get(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(statsRes.data);

        // Load recent events
        const eventsRes = await axios.get(`${API_BASE}/events/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventsList = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.events || [];
        setEvents(eventsList.slice(0, 10));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        if ((error as any).response?.status === 401) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_name');
    navigate('/');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
    { id: 'events', label: 'Événements', icon: '🎉', path: '/admin/events' },
    { id: 'photos', label: 'Photos', icon: '📷', path: '/admin/photos' },
    { id: 'statistics', label: 'Statistiques', icon: '📈', path: '/admin/statistics' },
  ];

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-blue-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-blue-800">
          {sidebarOpen && <h2 className="text-xl font-bold">Owen&apos;Snap</h2>}
          <button
            className="p-2 hover:bg-blue-800 rounded-lg transition"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-blue-800 transition text-left"
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition font-medium"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="bg-white shadow-sm p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenue, {adminName}! 👋</h1>
          <p className="text-gray-600">Tableau de bord de gestion des événements</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600 text-lg">Chargement du tableau de bord...</div>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total_events}</div>
                  <div className="text-gray-700 font-semibold">Événements totaux</div>
                  <div className="text-sm text-gray-500 mt-2">+2 ce mois</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">{stats.total_photos}</div>
                  <div className="text-gray-700 font-semibold">Photos totales</div>
                  <div className="text-sm text-gray-500 mt-2">+145 aujourd'hui</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{stats.total_storage_mb.toFixed(1)}</div>
                  <div className="text-gray-700 font-semibold">Stockage (MB)</div>
                  <div className="text-sm text-gray-500 mt-2">25% utilisé</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stats.events_today}</div>
                  <div className="text-gray-700 font-semibold">Événements aujourd'hui</div>
                  <div className="text-sm text-gray-500 mt-2">En direct</div>
                </div>
              </div>

              {/* Recent Events */}
              {events.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">📋 Événements récents</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom de l&apos;événement</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Photos</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {events.map((event) => (
                          <tr key={event.id || event._id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-semibold text-gray-800">{event.name}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                {event.code}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">{new Date(event.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-gray-700">{event.photo_count || 0}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => navigate('/admin/photos')}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
                              >
                                📷 Gérer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
              Erreur lors du chargement des données du tableau de bord
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
