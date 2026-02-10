import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Gallery.css'

interface Event {
  id: number
  code: string
  name: string
}

interface Photo {
  _id: string
  filename: string
  event_id: number
  status: string
  uploaded_at: string
  file_exists?: boolean
}

function Gallery() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadPhotos()
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      const response = await axios.get('/api/v1/events/')
      setEvents(response.data.events)
    } catch (error) {
      console.error('Erreur chargement événements:', error)
    }
  }

  const loadPhotos = async () => {
    if (!selectedEventId) return
    
    setLoading(true)
    try {
      const response = await axios.get(`/api/v1/photos/event/${selectedEventId}`)
      setPhotos(response.data.photos || [])
    } catch (error) {
      console.error('Erreur chargement photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDiagnostics = async () => {
    if (!selectedEventId) return
    
    try {
      const response = await axios.get(`/api/v1/photos/event/${selectedEventId}/verify`)
      setDiagnostics(response.data)
    } catch (error) {
      console.error('Erreur diagnostic:', error)
    }
  }

  const cleanupMissingPhotos = async () => {
    if (!selectedEventId) return
    
    const confirmed = window.confirm(
      `Êtes-vous sûr ? Cela supprimera ${diagnostics?.missing_files || 0} photo(s) manquante(s) de la base de données.`
    )
    
    if (!confirmed) return
    
    try {
      await axios.post(`/api/v1/photos/event/${selectedEventId}/cleanup-missing`)
      alert('✅ Photos manquantes supprimées !')
      setDiagnostics(null)
      loadPhotos()
    } catch (error) {
      console.error('Erreur nettoyage:', error)
      alert('❌ Erreur lors du nettoyage')
    }
  }

  const migratePaths = async () => {
    const confirmed = window.confirm(
      'Cela va convertir tous les chemins absolus en chemins relatifs.\nCette opération doit être faite une seule fois.\n\nContinuer ?'
    )
    
    if (!confirmed) return
    
    try {
      const response = await axios.post(`/api/v1/photos/migrate-paths`)
      alert(`✅ ${response.data.migrated_count} chemin(s) converti(s)`)
      setDiagnostics(null)
      loadPhotos()
    } catch (error) {
      console.error('Erreur migration:', error)
      alert('❌ Erreur lors de la migration')
    }
  }

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const downloadPhoto = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/uploads/photos/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadSelectedPhotos = () => {
    selectedPhotos.forEach(photoId => {
      const photo = photos.find(p => p._id === photoId)
      if (photo) {
        downloadPhoto(photo.filename)
      }
    })
  }

  return (
    <div className="gallery-container">
      <header className="gallery-header">
        <div className="header-content">
          <h1 className="logo">📸 Galerie Complète</h1>
          <p className="tagline">Visualisez toutes les photos d'un événement</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Retour
        </button>
      </header>

      <main className="gallery-main">
        <div className="gallery-setup">
          <label>Sélectionnez un événement :</label>
          <select 
            value={selectedEventId || ''} 
            onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value) : null)}
            className="event-select"
          >
            <option value="">-- Choisir un événement --</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.code})
              </option>
            ))}
          </select>
        </div>

        {loading && <div className="loading">⏳ Chargement des photos...</div>}

        {selectedEventId && photos.length > 0 && (
          <section className="gallery-section">
            <div className="gallery-header-info">
              <div>
                <h2>✅ {photos.length} photo{photos.length > 1 ? 's' : ''}</h2>
                <div style={{marginTop: '10px', display: 'flex', gap: '10px'}}>
                  <button 
                    onClick={loadDiagnostics}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      background: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🔍 Diagnostiquer
                  </button>
                  <button 
                    onClick={migratePaths}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      background: '#e3f2fd',
                      border: '1px solid #90caf9',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#1976d2'
                    }}
                  >
                    🔄 Migrer chemins
                  </button>
                </div>
              </div>
              {selectedPhotos.size > 0 && (
                <div className="selection-badge">{selectedPhotos.size} sélectionnée{selectedPhotos.size > 1 ? 's' : ''}</div>
              )}
            </div>

            {diagnostics && (
              <div style={{
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: diagnostics.missing_files > 0 ? '#fff3cd' : '#d4edda',
                border: `1px solid ${diagnostics.missing_files > 0 ? '#ffc107' : '#28a745'}`,
                borderRadius: '8px',
                color: diagnostics.missing_files > 0 ? '#856404' : '#155724'
              }}>
                <strong>📊 Diagnostic :</strong> {diagnostics.valid_files} fichier{diagnostics.valid_files > 1 ? 's' : ''} valide{diagnostics.valid_files > 1 ? 's' : ''} / {diagnostics.total_in_db} en base de données
                {diagnostics.missing_files > 0 && (
                  <div style={{marginTop: '10px', fontSize: '0.9em'}}>
                    ⚠️ {diagnostics.missing_files} photo{diagnostics.missing_files > 1 ? 's' : ''} manquante{diagnostics.missing_files > 1 ? 's' : ''} (fichier{diagnostics.missing_files > 1 ? 's' : ''} supprimé{diagnostics.missing_files > 1 ? 's' : ''})
                    <br />
                    <button
                      onClick={cleanupMissingPhotos}
                      style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🗑️ Nettoyer les photos manquantes
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="photos-grid">
              {photos.map((photo) => (
                <div 
                  key={photo._id} 
                  className={`photo-card ${selectedPhotos.has(photo._id) ? 'selected' : ''}`}
                  onClick={() => togglePhotoSelection(photo._id)}
                  title={!photo.file_exists ? '⚠️ Fichier manquant' : ''}
                >
                  <div className="photo-wrapper">
                    <img 
                      src={`/uploads/photos/${photo.filename}`}
                      alt="Photo"
                      className="photo-image"
                      style={{opacity: !photo.file_exists ? 0.5 : 1}}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f5f5f5" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="64">📸</text></svg>'
                      }}
                    />
                    
                    {!photo.file_exists && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '10px'
                      }}>
                        ❌ Manquant
                      </div>
                    )}
                    
                    <div className="photo-overlay">
                      <div className="photo-actions">
                        {photo.file_exists && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadPhoto(photo.filename)
                            }}
                            className="action-btn download-btn"
                            title="Télécharger cette photo"
                          >
                            ⬇️
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="checkbox-overlay">
                      <input 
                        type="checkbox"
                        checked={selectedPhotos.has(photo._id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          togglePhotoSelection(photo._id)
                        }}
                        className="photo-checkbox"
                        disabled={!photo.file_exists}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPhotos.size > 0 && (
              <div className="bulk-download">
                <button 
                  onClick={downloadSelectedPhotos}
                  className="btn-primary btn-bulk"
                >
                  📥 Télécharger {selectedPhotos.size} photo{selectedPhotos.size > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </section>
        )}

        {selectedEventId && photos.length === 0 && !loading && (
          <div className="no-photos">
            <p>📭 Aucune photo trouvée pour cet événement</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Gallery
