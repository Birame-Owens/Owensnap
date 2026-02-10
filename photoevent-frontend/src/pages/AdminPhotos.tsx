import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Event {
  id?: string | number;
  _id?: string | number;
  name: string;
  code: string;
  date: string;
  photo_count?: number;
}

interface Photo {
  _id: string;
  filename: string;
  event_id: string | number;
  created_at: string;
  file_exists?: boolean;
}

interface UploadProgress {
  [key: string]: number;
}

export default function AdminPhotos() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | number>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        if (eventsList.length > 0) {
          const firstEvent = eventsList[0];
          setSelectedEvent(firstEvent.id || firstEvent._id);
        }
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

  // Load photos for selected event
  useEffect(() => {
    const loadPhotos = async () => {
      if (!selectedEvent) return;

      try {
        const res = await axios.get(`${API_BASE}/photos/event/${selectedEvent}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotos(res.data.photos || []);
      } catch (error) {
        setPhotos([]);
      }
    };

    loadPhotos();
  }, [selectedEvent, token]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || !selectedEvent) return;

    const fileArray = Array.from(files);
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('event_id', String(selectedEvent));
    fileArray.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await axios.post(
        `${API_BASE}/photos/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress({
                overall: percentCompleted,
              });
            }
          },
        }
      );

      const successCount = res.data?.length || fileArray.length;
      setMessage({
        type: 'success',
        text: `${successCount} photo${successCount !== 1 ? 's' : ''} téléchargée(s)`,
      });

      try {
        const res = await axios.get(`${API_BASE}/photos/event/${selectedEvent}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPhotos(res.data.photos || []);
      } catch (error) {
        // Silent error
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors du téléchargement',
      });
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress({});

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('Êtes-vous sûr de supprimer cette photo ?')) return;

    try {
      await axios.delete(`${API_BASE}/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPhotos(photos.filter((p) => p._id !== photoId));
      setMessage({ type: 'success', text: 'Photo supprimée' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  if (!token) {
    return <div className="p-6">⚠️ Authentification requise</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">📷 Gestion des photos</h2>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 px-6 py-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter des photos</h3>

          <div className="mb-6">
            <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un événement *
            </label>
            <select
              id="event-select"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="">Choisir un événement...</option>
              {events.map((event) => (
                <option key={event.id || event._id} value={event.id || event._id}>
                  {event.name} ({event.code}) - {event.photo_count || 0} photos
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (fileInputRef.current) {
                    fileInputRef.current.files = files;
                    handleFileSelect({
                      currentTarget: fileInputRef.current,
                    } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
              >
                <div className="text-4xl mb-2">📁</div>
                <p className="text-lg font-semibold text-gray-700 mb-1">
                  {uploading ? '⏳ Téléchargement en cours...' : 'Glissez les photos ici ou cliquez'}
                </p>
                <p className="text-sm text-gray-500">
                  {uploading ? 'Traitement en cours...' : 'JPG, PNG, WebP (50 MB max par fichier)'}
                </p>
              </div>

              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Progression globale</span>
                    <span className="text-sm font-semibold text-gray-700">{uploadProgress.overall || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.overall || 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedEvent && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              ℹ️ Sélectionnez d'abord un événement pour télécharger des photos
            </div>
          )}
        </div>

        {/* Photos Section */}
        {selectedEvent && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">📸 Photos ({photos.length})</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-600">Chargement des photos...</div>
            ) : photos.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p>Aucune photo pour le moment. Téléchargez des photos pour commencer !</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                {photos.map((photo) => (
                  <div
                    key={photo._id}
                    className={`rounded-lg overflow-hidden shadow hover:shadow-lg transition ${!photo.file_exists ? 'opacity-50' : ''}`}
                  >
                    <div className="relative bg-gray-100 aspect-square">
                      {photo.file_exists !== false ? (
                        <img
                          src={`/uploads/photos/${photo.filename}`}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget.parentElement?.querySelector('.photo-placeholder') as HTMLElement)?.classList.add('block');
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="photo-placeholder hidden absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600 text-2xl">
                        ❌
                      </div>
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-sm font-semibold text-gray-700 truncate" title={photo.filename}>
                        {photo.filename.substring(0, 30)}
                        {photo.filename.length > 30 ? '...' : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(photo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg transition disabled:opacity-50"
                      onClick={() => deletePhoto(photo._id)}
                      disabled={uploading}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
