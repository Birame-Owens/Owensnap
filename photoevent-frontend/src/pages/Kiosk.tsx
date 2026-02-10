import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Kiosk.css'

interface SearchResult {
  photo_id: string
  filename: string
  similarity: number
  bbox: number[]
  face_index: number
}

function Kiosk() {
  const navigate = useNavigate()
  const [eventCode, setEventCode] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.20)

  // Effet pour attacher le stream à la vidéo
  useEffect(() => {
    if (stream && videoRef.current && cameraActive) {
      console.log('Attachement du stream à la vidéo...')
      videoRef.current.srcObject = stream
      
      // Écouter le chargement des métadonnées
      const handleLoadedMetadata = () => {
        console.log('Metadata chargées, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Erreur play():', err)
          })
        }
      }
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      
      // Cleanup
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }
    }
  }, [stream, cameraActive])

  const startCamera = async () => {
    if (!eventCode.trim()) {
      setError('❌ Veuillez entrer un code événement')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Valider le code événement
      await axios.get(`/api/v1/events/code/${eventCode.toUpperCase()}`)
      
      // Code valide, démarrer la caméra
      try {
        console.log('Demande d\'accès à la caméra...')
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log('Stream obtenu:', mediaStream)
        console.log('Tracks vidéo:', mediaStream.getVideoTracks())
        
        // Le useEffect va gérer l'attachement
        setStream(mediaStream)
        setCameraActive(true)
        setError('')
        setLoading(false)
      } catch (cameraError: any) {
        console.error('Erreur accès caméra:', cameraError)
        setLoading(false)
        setError(`❌ Caméra indisponible: ${cameraError.message || 'Vérifiez les permissions.'}`)
      }
    } catch (error: any) {
      setLoading(false)
      setError(`❌ Code événement "${eventCode.toUpperCase()}" introuvable.`)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  const captureAndSearch = async () => {
    if (!videoRef.current || !canvasRef.current || !eventCode) return

    setLoading(true)
    setError('')

    try {
      const eventsResponse = await axios.get(`/api/v1/events/code/${eventCode.toUpperCase()}`)
      const event = eventsResponse.data
      
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      
      const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1]

      const response = await axios.post('/api/v1/search/face', {
        event_id: event.id,
        face_image: imageBase64,
        threshold: 0.15
      })

      // Afficher TOUS les résultats trouvés, triés par similarité
      const allMatches = response.data.matches
      allMatches.sort((a: SearchResult, b: SearchResult) => b.similarity - a.similarity)

      setSearchResults(allMatches)
      setSelectedPhotos(new Set())
      
      if (allMatches.length === 0) {
        setError('⚠️ Aucune photo trouvée. Assurez-vous d\'être bien face à la caméra avec un bon éclairage.')
      }
    } catch (error: any) {
      console.error('Erreur recherche:', error)
      setError(error.response?.data?.detail || '❌ Erreur lors de la recherche')
    } finally {
      setLoading(false)
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

  const downloadSelectedPhotos = () => {
    selectedPhotos.forEach(photoId => {
      const result = searchResults.find(r => r.photo_id === photoId)
      if (result) {
        const link = document.createElement('a')
        link.href = `http://localhost:8000/uploads/photos/${result.filename}`
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    })
  }

  const downloadPhoto = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/uploads/photos/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const printPhoto = (filename: string) => {
    const url = `/uploads/photos/${filename}`
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  return (
    <div className="kiosk-container">
      <header className="kiosk-header">
        <div className="header-content">
          <h1 className="logo">💎 Owen'Snap</h1>
          <p className="tagline">Trouvez vos photos en un clin d'œil</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Accueil
        </button>
      </header>

      <main className="kiosk-main">
        {!cameraActive ? (
          <section className="setup-section">
            <div className="setup-card">
              <div className="setup-icon">📷</div>
              <h2>Retrouvez vos photos</h2>
              <p>Entrez le code de votre événement et prenez une photo</p>
              
              <div className="input-group">
                <label>Code événement</label>
                <input
                  type="text"
                  placeholder="Ex: JK0LHAWK"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="input-code"
                  onKeyPress={(e) => e.key === 'Enter' && startCamera()}
                />
              </div>
              
              {error && <div className="error-box" style={{marginBottom: '20px'}}>{error}</div>}
              
              <button 
                onClick={startCamera} 
                disabled={!eventCode.trim() || loading}
                className="btn-primary btn-large"
              >
                {loading ? '⏳ Vérification...' : '🎬 Démarrer la caméra'}
              </button>
            </div>
          </section>
        ) : (
          <section className="camera-section">
            <div className="video-wrapper">
              <div className="video-container">
                <video 
                  ref={videoRef} 
                  autoPlay={true}
                  playsInline={true}
                  muted={true}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: 'block',
                    backgroundColor: '#1a1a1a'
                  }}
                />
                <div className="face-guide">
                  <div className="circle-guide"></div>
                  <p>Placez votre visage dans le cercle</p>
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            
            <div className="camera-controls">
              <button 
                onClick={captureAndSearch} 
                disabled={loading}
                className="btn-primary btn-capture"
              >
                {loading ? '⏳ Recherche en cours...' : '✨ Capturer et chercher'}
              </button>
              <button onClick={stopCamera} className="btn-secondary">
                ✕ Annuler
              </button>
            </div>
          </section>
        )}

        {error && <div className="error-box">{error}</div>}

        {searchResults.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <div>
                <h2>✅ {searchResults.length} photo{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</h2>
                <p style={{fontSize: '0.9em', color: '#666', marginTop: '8px'}}>Ajustez le curseur pour filtrer par similarité</p>
              </div>
              {selectedPhotos.size > 0 && (
                <div className="selection-badge">{selectedPhotos.size} sélectionnée{selectedPhotos.size > 1 ? 's' : ''}</div>
              )}
            </div>

            <div style={{padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>
                Seuil de similarité: {(similarityThreshold * 100).toFixed(0)}%
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.05" 
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                style={{width: '100%', cursor: 'pointer'}}
              />
              <p style={{fontSize: '0.85em', color: '#666', marginTop: '8px'}}>
                Affichage: {searchResults.filter(r => r.similarity >= similarityThreshold).length} photo{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 's' : ''} correspondant{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 'es' : ''}
              </p>
            </div>

            <div className="photos-grid">
              {searchResults.filter(r => r.similarity >= similarityThreshold).map((result) => (
                <div 
                  key={result.photo_id} 
                  className={`photo-card ${selectedPhotos.has(result.photo_id) ? 'selected' : ''}`}
                  onClick={() => togglePhotoSelection(result.photo_id)}
                >
                  <div className="photo-wrapper">
                    <img 
                      src={`/uploads/photos/${result.filename}`}
                      alt="Photo trouvée"
                      className="photo-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f5f5f5" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="64">📸</text></svg>'
                      }}
                    />
                    
                    <div className="photo-overlay">
                      <div className="confidence-badge">
                        {(result.similarity * 100).toFixed(0)}%
                      </div>
                      
                      <div className="photo-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadPhoto(result.filename)
                          }}
                          className="action-btn download-btn"
                          title="Télécharger cette photo"
                        >
                          ⬇️
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            printPhoto(result.filename)
                          }}
                          className="action-btn print-btn"
                          title="Imprimer cette photo"
                        >
                          🖨️
                        </button>
                      </div>
                    </div>

                    <div className="checkbox-overlay">
                      <input 
                        type="checkbox"
                        checked={selectedPhotos.has(result.photo_id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          togglePhotoSelection(result.photo_id)
                        }}
                        className="photo-checkbox"
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
      </main>
    </div>
  )
}

export default Kiosk
