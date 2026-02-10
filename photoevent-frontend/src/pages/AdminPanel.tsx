import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, X, Trash2, Grid3x3, List, Plus, BarChart3, Calendar, Image as ImageIcon, Menu, ChevronRight } from 'lucide-react';

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

type Tab = 'dashboard' | 'events' | 'photos';

interface Stats {
  total_events: number;
  total_photos: number;
  total_storage_mb: number;
  events_today: number;
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | number>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [moveToEvent, setMoveToEvent] = useState<string | number>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = '/api/v1';

  // Load stats and events
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/events/`),
          axios.get(`${API_BASE}/admin/stats`).catch(() => null)
        ]);

        let eventsList = Array.isArray(eventsRes.data) 
          ? eventsRes.data 
          : eventsRes.data.events || [];

        if (!Array.isArray(eventsList)) {
          eventsList = [];
        }

        setEvents(eventsList);
        if (eventsList.length > 0) {
          const firstEvent = eventsList[0];
          setSelectedEvent(firstEvent.id || firstEvent._id);
        }

        if (statsRes?.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load photos for selected event
  useEffect(() => {
    const loadPhotos = async () => {
      if (!selectedEvent) return;

      try {
        const res = await axios.get(`${API_BASE}/photos/event/${selectedEvent}`);
        setPhotos(res.data.photos || []);
        setSelectedPhotos(new Set());
      } catch (error) {
        setPhotos([]);
      }
    };

    loadPhotos();
  }, [selectedEvent]);

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
      const res = await axios.post(`${API_BASE}/photos/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress((prev) => ({ ...prev, upload: progress }));
        },
      });

      setMessage({ type: 'success', text: `${fileArray.length} photo(s) uploadées ✓` });
      setUploadProgress({});

      const photosRes = await axios.get(`${API_BASE}/photos/event/${selectedEvent}`);
      setPhotos(photosRes.data.photos || []);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de l\'upload',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createEvent = async () => {
    if (!newEventName.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/events/`, {
        name: newEventName,
        date: newEventDate,
      });

      const newEvent = res.data.event || res.data;
      setEvents([newEvent, ...events]);
      setSelectedEvent(newEvent.id || newEvent._id);
      setNewEventName('');
      setShowNewEventForm(false);
      setMessage({ type: 'success', text: 'Événement créé ✓' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de la création',
      });
    }
  };

  const movePhotosToEvent = async () => {
    if (selectedPhotos.size === 0 || !moveToEvent) return;
    if (!window.confirm(`Ajouter ${selectedPhotos.size} photo(s) à cet événement?`)) return;

    try {
      for (const photoId of selectedPhotos) {
        await axios.patch(`${API_BASE}/photos/${photoId}`, {
          event_id: moveToEvent,
        });
      }
      setSelectedPhotos(new Set());
      const photosRes = await axios.get(`${API_BASE}/photos/event/${selectedEvent}`);
      setPhotos(photosRes.data.photos || []);
      setMessage({ type: 'success', text: `Photos ajoutées ✓` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du déplacement' });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (fileInputRef.current) {
      fileInputRef.current.files = files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(changeEvent);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('Supprimer cette photo?')) return;

    try {
      await axios.delete(`${API_BASE}/photos/${photoId}`);
      setPhotos(photos.filter((p) => p._id !== photoId));
      setMessage({ type: 'success', text: 'Photo supprimée' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const getPhotoUrl = (filename: string) => {
    return `/uploads/photos/${filename}`;
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedPhotos.size} photo(s)?`)) return;

    try {
      for (const photoId of selectedPhotos) {
        await axios.delete(`${API_BASE}/photos/${photoId}`);
      }
      setPhotos(photos.filter((p) => !selectedPhotos.has(p._id)));
      setSelectedPhotos(new Set());
      setMessage({ type: 'success', text: `${selectedPhotos.size} photo(s) supprimée(s) ✓` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-black text-white transition-all duration-300 fixed h-screen flex flex-col`}>
        <div className="p-4 flex justify-between items-center">
          {sidebarOpen && <h1 className="text-lg font-light">ADMIN</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-900 rounded">
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          <button
            onClick={() => setTab('dashboard')}
            className={`w-full px-4 py-3 rounded flex items-center gap-3 transition-colors ${
              tab === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            {sidebarOpen && <span>Statistiques</span>}
          </button>
          <button
            onClick={() => setTab('events')}
            className={`w-full px-4 py-3 rounded flex items-center gap-3 transition-colors ${
              tab === 'events' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="h-5 w-5" />
            {sidebarOpen && <span>Événements</span>}
          </button>
          <button
            onClick={() => setTab('photos')}
            className={`w-full px-4 py-3 rounded flex items-center gap-3 transition-colors ${
              tab === 'photos' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="h-5 w-5" />
            {sidebarOpen && <span>Photos</span>}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-light text-gray-900">
              {tab === 'dashboard' && 'Statistiques'}
              {tab === 'events' && 'Événements'}
              {tab === 'photos' && 'Photos'}
            </h2>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mx-8 mt-6 p-4 rounded-lg border transition-all" style={{
            borderColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
          }}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div className="p-8">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white px-6 py-8 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm font-medium">Événements</p>
                  <p className="text-4xl font-light mt-2">{stats.total_events}</p>
                </div>
                <div className="bg-white px-6 py-8 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm font-medium">Photos</p>
                  <p className="text-4xl font-light mt-2">{stats.total_photos}</p>
                </div>
                <div className="bg-white px-6 py-8 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm font-medium">Espace utilisé</p>
                  <p className="text-4xl font-light mt-2">{stats.total_storage_mb.toFixed(1)}MB</p>
                </div>
                <div className="bg-white px-6 py-8 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm font-medium">Aujourd'hui</p>
                  <p className="text-4xl font-light mt-2">{stats.events_today}</p>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Événements récents</h3>
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id || event._id} className="bg-white px-6 py-4 rounded-lg border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-500">{event.code} • {event.date}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-600">{event.photo_count || 0} photos</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {tab === 'events' && (
          <div className="p-8">
            <div className="mb-6">
              {!showNewEventForm ? (
                <button
                  onClick={() => setShowNewEventForm(true)}
                  className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-900"
                >
                  <Plus className="h-5 w-5" />
                  Nouvel événement
                </button>
              ) : (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-4">Créer un événement</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nom de l'événement"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={createEvent}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                      >
                        Créer
                      </button>
                      <button
                        onClick={() => setShowNewEventForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id || event._id}
                  onClick={() => {
                    setSelectedEvent(event.id || event._id);
                    setTab('photos');
                  }}
                  className="bg-white p-6 rounded-lg border border-gray-200 hover:border-black cursor-pointer transition-colors flex justify-between items-center group"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-black">{event.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{event.code} • {event.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">{event.photo_count || 0} photos</span>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-black" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {tab === 'photos' && (
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Upload Section */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-32">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter des photos</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Événement</label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Sélectionner</option>
                      {events.map((event) => (
                        <option key={event.id || event._id} value={event.id || event._id}>
                          {event.name} ({event.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !uploading && selectedEvent && fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={uploading || !selectedEvent}
                    />

                    {!uploading ? (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Glissez vos photos</p>
                        <p className="text-xs text-gray-500 mt-1">ou cliquez</p>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black mb-2"></div>
                        <p className="text-sm font-medium">{uploadProgress.upload || 0}%</p>
                      </>
                    )}
                  </div>

                  {!selectedEvent && (
                    <p className="text-xs text-red-600 mt-2">Sélectionner un événement</p>
                  )}
                </div>
              </div>

              {/* Photos Gallery */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Photos ({photos.length})</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${
                          viewMode === 'grid'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Grid3x3 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${
                          viewMode === 'list'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <List className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {selectedPhotos.size > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-blue-900 font-medium">
                          {selectedPhotos.size} photo(s) sélectionnée(s)
                        </p>
                        <div className="flex gap-2">
                          <select
                            value={moveToEvent}
                            onChange={(e) => setMoveToEvent(e.target.value)}
                            className="px-3 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Ajouter à...</option>
                            {events
                              .filter((e) => (e.id || e._id) !== selectedEvent)
                              .map((event) => (
                                <option key={event.id || event._id} value={event.id || event._id}>
                                  {event.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={movePhotosToEvent}
                            disabled={!moveToEvent}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={deleteSelectedPhotos}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {photos.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Aucune photo pour cet événement</p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-3 gap-4">
                      {photos.map((photo) => (
                        <div
                          key={photo._id}
                          className="relative group cursor-pointer"
                          onClick={() => togglePhotoSelection(photo._id)}
                        >
                          <img
                            src={getPhotoUrl(photo.filename)}
                            alt="Photo"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <div
                            className={`absolute inset-0 rounded-lg bg-black transition-opacity ${
                              selectedPhotos.has(photo._id)
                                ? 'opacity-30'
                                : 'opacity-0 group-hover:opacity-20'
                            }`}
                          />
                          <input
                            type="checkbox"
                            checked={selectedPhotos.has(photo._id)}
                            onChange={() => togglePhotoSelection(photo._id)}
                            className="absolute top-2 right-2 w-5 h-5"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(photo._id);
                            }}
                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {photos.map((photo) => (
                        <div
                          key={photo._id}
                          className="py-3 px-3 flex items-center justify-between hover:bg-gray-50 group"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedPhotos.has(photo._id)}
                              onChange={() => togglePhotoSelection(photo._id)}
                              className="w-4 h-4"
                            />
                            <img
                              src={getPhotoUrl(photo.filename)}
                              alt="Photo"
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{photo.filename}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deletePhoto(photo._id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
