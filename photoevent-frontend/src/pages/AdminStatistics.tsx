import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface StatisticsData {
  total_events: number;
  total_photos: number;
  total_storage_mb: number;
  events_today: number;
  photos_per_event: Array<{
    event_name: string;
    event_code: string;
    photo_count: number;
    storage_mb: number;
    date: string;
  }>;
  top_upload_hours: Array<{
    hour: number;
    count: number;
  }>;
  recent_uploads: Array<{
    filename: string;
    event_id: string;
    event_name?: string;
    created_at: string;
    size_mb?: number;
  }>;
}

export default function AdminStatistics() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('admin_token');

  const API_BASE = 'http://localhost:8000/api/v1';

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/statistics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadStatistics();
    }
  }, [token]);

  if (!token) {
    return <div className="p-6">⚠️ Authentification requise</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="text-gray-600 text-lg">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error || 'Erreur lors du chargement des statistiques'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">📊 Statistiques et analytique</h2>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total_events}</div>
            <div className="text-gray-700 font-semibold">Événements totaux</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.total_photos}</div>
            <div className="text-gray-700 font-semibold">Photos totales</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.total_storage_mb.toFixed(2)}</div>
            <div className="text-gray-700 font-semibold">Stockage (MB)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">{stats.events_today}</div>
            <div className="text-gray-700 font-semibold">Événements aujourd'hui</div>
          </div>
        </div>

        {/* Photos per Event */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">📸 Photos par événement</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Événement</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Photos</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stockage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.photos_per_event.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucun événement pour le moment
                    </td>
                  </tr>
                ) : (
                  stats.photos_per_event.map((event, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{event.event_name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {event.event_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {event.photo_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{event.storage_mb.toFixed(2)} MB</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Patterns */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">⏰ Activité de téléchargement par heure</h3>
          </div>
          <div className="p-6">
            {stats.top_upload_hours.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune activité de téléchargement pour le moment</div>
            ) : (
              <div className="flex items-end gap-4 h-64 justify-center">
                {stats.top_upload_hours.map((hourData) => {
                  const maxCount = Math.max(
                    ...stats.top_upload_hours.map((h) => h.count),
                    1
                  );
                  const percentage = (hourData.count / maxCount) * 100;

                  return (
                    <div key={hourData.hour} className="flex flex-col items-center">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{hourData.count}</div>
                      <div className="bg-blue-500 rounded-t" style={{ width: '40px', height: `${Math.max(percentage, 10)}px` }} />
                      <div className="text-sm font-semibold text-gray-700 mt-2">{hourData.hour}h</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">🕐 Téléchargements récents</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom du fichier</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Événement</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Créé</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Taille</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recent_uploads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      Aucun téléchargement pour le moment
                    </td>
                  </tr>
                ) : (
                  stats.recent_uploads.map((upload, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-700 break-all">{upload.filename}</td>
                      <td className="px-6 py-4 text-gray-700">{upload.event_name || 'Inconnu'}</td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {new Date(upload.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{(upload.size_mb || 0).toFixed(2)} MB</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">📈 Résumé</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.total_photos > 0
                  ? (stats.total_storage_mb / stats.total_photos).toFixed(2)
                  : '0'}
                MB
              </div>
              <div className="text-gray-700 font-semibold">Taille moyenne des photos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.total_events > 0
                  ? (stats.total_photos / stats.total_events).toFixed(0)
                  : '0'}
              </div>
              <div className="text-gray-700 font-semibold">Moyenne de photos/événement</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {stats.top_upload_hours.length > 0
                  ? stats.top_upload_hours.sort((a, b) => b.count - a.count)[0]
                      .hour + 'h'
                  : '—'}
              </div>
              <div className="text-gray-700 font-semibold">Heure de pointe des téléchargements</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
