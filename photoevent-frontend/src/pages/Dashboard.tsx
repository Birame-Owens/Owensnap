import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

interface Event {
  id: number
  code: string
  name: string
  date: string
  created_at: string
}

interface Photo {
  id: string
  event_id: number
  filename: string
  faces_count: number
  status: string
}

function Dashboard() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [newEvent, setNewEvent] = useState({ name: '', date: '' })
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadPhotos(selectedEventId)
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      const response = await axios.get('/api/v1/events/')
      setEvents(response.data.events)
      setError('')
    } catch (error: any) {
      console.error('Erreur chargement événements:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  const loadPhotos = async (eventId: number) => {
    try {
      const response = await axios.get(`/api/v1/photos/event/${eventId}`)
      setPhotos(response.data.photos || [])
    } catch (error: any) {
      console.error('Erreur chargement photos:', error)
    }
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await axios.post('/api/v1/events/', newEvent)
      setNewEvent({ name: '', date: '' })
      setSuccess('✅ Événement créé avec succès!')
      setTimeout(() => setSuccess(''), 4000)
      loadEvents()
    } catch (error: any) {
      console.error('Erreur création événement:', error)
      setError('❌ ' + (error.response?.data?.detail || 'Erreur lors de la création'))
    }
  }

  const uploadPhotos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEventId || !uploadFiles) return

    setUploading(true)
    const formData = new FormData()
    formData.append('event_id', selectedEventId.toString())
    
    Array.from(uploadFiles).forEach(file => {
      formData.append('files', file)
    })

    try {
      await axios.post('/api/v1/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess(`✅ ${uploadFiles.length} photo(s) uploadée(s) avec succès!`)
      setTimeout(() => setSuccess(''), 4000)
      setUploadFiles(null)
      setError('')
      loadPhotos(selectedEventId)
    } catch (error: any) {
      console.error('Erreur upload photos:', error)
      setError('❌ ' + (error.response?.data?.detail || 'Erreur lors de l\'upload'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">💎 Owen'Snap - Espace Photographe</h1>
          <p className="header-subtitle">Gérez vos événements et uploadez vos photos</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Accueil
        </button>
      </header>

      <main className="dashboard-main">
        {error && <div className="alert error-box">{error}</div>}
        {success && <div className="alert success-box">{success}</div>}

        <div className="dashboard-grid">
          {/* SECTION CRÉER UN ÉVÉNEMENT */}
          <section className="card create-event-card">
            <div className="card-header">
              <h2>🎉 Créer un Événement</h2>
              <p>Commencez par créer votre événement</p>
            </div>
            <form onSubmit={createEvent} className="form">
              <div className="form-group">
                <label>Nom de l'événement</label>
                <input
                  type="text"
                  placeholder="Ex: Mariage Sarah & Jean"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  required
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-primary btn-submit">
                ➕ Créer l'événement
              </button>
            </form>
          </section>

          {/* SECTION ÉVÉNEMENTS */}
          <section className="card events-card">
            <div className="card-header">
              <h2>📋 Vos Événements</h2>
              <span className="event-count">{events.length}</span>
            </div>
            {loading ? (
              <div className="loading">⏳ Chargement...</div>
            ) : events.length === 0 ? (
              <div className="empty-state">
                <p>Aucun événement encore. Créez-en un pour commencer! 🎬</p>
              </div>
            ) : (
              <div className="events-list">
                {events.map(event => (
                  <div key={event.id} className="event-item" onClick={() => setSelectedEventId(event.id)}>
                    <div className="event-info">
                      <h4>{event.name}</h4>
                      <p className="event-date">📅 {new Date(event.date).toLocaleDateString('fr-FR')}</p>
                      <p className="event-code">Code: <span className="code-badge">{event.code}</span></p>
                    </div>
                    <div className="event-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION UPLOAD */}
          {selectedEventId && (
            <section className="card upload-card">
              <div className="card-header">
                <h2>📸 Uploader des Photos</h2>
                <p>Pour l'événement sélectionné</p>
              </div>
              <form onSubmit={uploadPhotos} className="form">
                <div className="form-group">
                  <label>Sélectionner les photos</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setUploadFiles(e.target.files)}
                      required
                      className="file-input"
                      id="photo-input"
                    />
                    <label htmlFor="photo-input" className="file-label">
                      <span className="file-icon">📁</span>
                      <span className="file-text">
                        {uploadFiles ? `${uploadFiles.length} fichier(s) sélectionné(s)` : 'Cliquez ou glissez-déposez'}
                      </span>
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={uploading} className="btn-primary btn-submit">
                  {uploading ? '⏳ Upload en cours...' : '⬆️ Uploader les photos'}
                </button>
              </form>
            </section>
          )}

          {/* SECTION PHOTOS UPLOADÉES */}
          {selectedEventId && photos.length > 0 && (
            <section className="card photos-card">
              <div className="card-header">
                <h2>✅ Photos Uploadées</h2>
                <span className="photo-count">{photos.length}</span>
              </div>
              <div className="photos-list">
                {photos.map(photo => (
                  <div key={photo.id} className="photo-item">
                    <div className="photo-status">
                      {photo.status === 'ready' ? '✅' : '⏳'}
                    </div>
                    <div className="photo-info">
                      <p className="photo-name">{photo.filename}</p>
                      <p className="photo-faces">👤 {photo.faces_count} visage{photo.faces_count > 1 ? 's' : ''} détecté{photo.faces_count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
