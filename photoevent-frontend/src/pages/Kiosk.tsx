import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import QRCode from 'qrcode'
import './Kiosk.css'

interface SearchResult {
  photo_id: string
  filename: string
  similarity: number
  bbox: number[]
  face_index: number
}

interface ShareData {
  share_code: string
  expires_at: string
  photos_count: number
}

function Kiosk() {
  const navigate = useNavigate()
  const [eventCode, setEventCode] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [generatingShare, setGeneratingShare] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
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
      await axios.get(`http://localhost:8000/api/v1/events/code/${eventCode.toUpperCase()}`)
      
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
    if (!videoRef.current || !canvasRef.current || !eventCode) {
      setError('❌ Caméra non prête. Veuillez réessayer.')
      return
    }

    setLoading(true)
    setError('')
    setSearchResults([])

    try {
      const eventsResponse = await axios.get(`http://localhost:8000/api/v1/events/code/${eventCode.toUpperCase()}`)
      const event = eventsResponse.data
      
      const canvas = canvasRef.current
      const video = videoRef.current
      
      // Vérifier que la vidéo est prête
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Vidéo non prête. Veuillez patienter quelques secondes.')
      }
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Impossible d\'accéder au contexte canvas')
      ctx.drawImage(video, 0, 0)
      
      const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1]
      if (!imageBase64) throw new Error('Impossible de capturer l\'image')

      const response = await axios.post('http://localhost:8000/api/v1/search/face', {
        event_id: event.id,
        face_image: imageBase64,
        threshold: 0.15
      })

      const allMatches = response.data.matches || []
      allMatches.sort((a: SearchResult, b: SearchResult) => b.similarity - a.similarity)

      setSearchResults(allMatches)
      setSelectedPhotos(new Set())
      setShareData(null)
      
      if (allMatches.length === 0) {
        setError('⚠️ Aucune photo trouvée. Assurez-vous d\'être bien face à la caméra avec un bon éclairage.')
      }
    } catch (error: any) {
      console.error('Erreur recherche:', error)
      setError(error.response?.data?.detail || error.message || '❌ Erreur lors de la recherche')
      setSearchResults([])
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
    link.href = `http://localhost:8000/uploads/photos/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generateShareCode = async () => {
    if (selectedPhotos.size === 0) {
      setError('❌ Veuillez sélectionner au moins une photo')
      return
    }

    setGeneratingShare(true)
    setError('')

    try {
      // Récupérer l'event ID
      const eventsResponse = await axios.get(`http://localhost:8000/api/v1/events/code/${eventCode.toUpperCase()}`)
      const event = eventsResponse.data

      console.log('📤 Création du partage...')
      console.log('Event ID:', event.id)
      console.log('Photos sélectionnées:', Array.from(selectedPhotos))

      const payload = {
        event_id: event.id,
        face_id: 'auto_detected',
        selected_photo_ids: Array.from(selectedPhotos)
      }

      console.log('📝 Payload:', JSON.stringify(payload, null, 2))

      const response = await axios.post('http://localhost:8000/api/v1/shares', payload)

      console.log('✅ Partage créé:', response.data)

      const shareCode = response.data.share_code
      const shareUrl = `http://localhost:3000/share/${shareCode}`

      console.log('🔗 Share URL:', shareUrl)
      console.log('📱 Début de génération du QR code...')

      setShareData({
        share_code: shareCode,
        expires_at: response.data.expires_at,
        photos_count: selectedPhotos.size
      })

      // Générer le QR code après un délai pour permettre au DOM de rendre le canvas
      setTimeout(async () => {
        if (qrCanvasRef.current) {
          try {
            console.log('Canvas ref availability: TRUE')
            await QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            })
            console.log('✅ QR code généré avec succès')
          } catch (qrError: any) {
            console.error('❌ Erreur génération QR:', qrError)
          }
        } else {
          console.error('❌ Canvas ref not found - Attendez quelques secondes et réessayez')
        }
      }, 100)
    } catch (error: any) {
      console.error('❌ Erreur génération share:')
      console.error('Status:', error.response?.status)
      console.error('Data:', error.response?.data)
      console.error('Full error:', error)
      
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      error.message || 
                      'Erreur inconnue'
      setError(`❌ Erreur : ${errorMsg}`)
    } finally {
      setGeneratingShare(false)
    }
  }

  const resetAndStartOver = () => {
    setSearchResults([])
    setSelectedPhotos(new Set())
    setShareData(null)
    setCameraActive(false)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const printPhoto = (filename: string) => {
    const url = `http://localhost:8000/uploads/photos/${filename}`
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
          <h1 className="logo">Owen'Snap</h1>
          <p className="tagline">Reconnaissance faciale - Photos instantanées</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Retour
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
              {searchResults.filter(r => r.similarity >= similarityThreshold).map((result, index) => (
                <div 
                  key={`${result.photo_id}-${index}`}
                  className={`photo-card ${selectedPhotos.has(result.photo_id) ? 'selected' : ''}`}
                  onClick={() => togglePhotoSelection(result.photo_id)}
                >
                  <div className="photo-wrapper">
                    <img 
                      src={`http://localhost:8000/uploads/photos/${result.filename}`}
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
                <div style={{display: 'flex', gap: '20px', width: '100%', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap'}}>
                  <button 
                    onClick={generateShareCode}
                    disabled={generatingShare}
                    className="btn-primary btn-bulk"
                    style={{minWidth: '300px'}}
                  >
                    {generatingShare ? '⏳ Génération...' : `🔗 Générer code pour ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`}
                  </button>
                  <button 
                    onClick={() => setSelectedPhotos(new Set())}
                    className="btn-secondary"
                    style={{padding: '18px 30px', fontSize: '16px'}}
                  >
                    🔄 Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {shareData && (
          <section className="share-summary" style={{animation: 'slideUp 0.6s ease-out'}}>
            <div className="share-container">
              <div className="share-content">
                <h2 style={{textAlign: 'center', marginBottom: '30px', fontSize: '32px'}}>✨ Code de partage généré</h2>
                
                <div className="share-grid">
                  {/* QR Code Section */}
                  <div className="qr-section" style={{textAlign: 'center', padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '12px', marginBottom: '30px'}}>
                    <h3 style={{marginTop: 0, marginBottom: '20px'}}>📱 Code QR à scanner</h3>
                    <div style={{display: 'flex', justifyContent: 'center'}}>
                      <canvas 
                        ref={qrCanvasRef} 
                        width={320}
                        height={320}
                        style={{
                          border: '4px solid #2563EB',
                          borderRadius: '8px',
                          padding: '10px',
                          backgroundColor: 'white',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          display: 'block'
                        }}
                      />
                    </div>
                    <p style={{marginTop: '20px', color: '#666', fontSize: '14px'}}>
                      ☝️ Scannez ce code QR avec un smartphone pour accéder aux photos
                    </p>
                  </div>

                  {/* Share Info Section */}
                  <div className="share-info" style={{gridColumn: '1 / -1'}}>
                    <div className="info-card">
                      <h3>📸 Informations de partage</h3>
                      <div className="info-item">
                        <span className="label">Code :</span>
                        <span className="value" style={{fontFamily: 'monospace', fontWeight: 'bold', color: '#2563EB'}}>{shareData.share_code}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Photos :</span>
                        <span className="value">{shareData.photos_count}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Valide :</span>
                        <span className="value">48 heures ⏰</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Lien :</span>
                        <div style={{
                          wordBreak: 'break-all', 
                          fontSize: '13px', 
                          color: '#2563EB', 
                          fontWeight: 'bold', 
                          marginTop: '8px',
                          padding: '10px',
                          backgroundColor: '#EFF6FF',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE'
                        }}>
                          {window.location.origin}/share/{shareData.share_code}
                        </div>
                      </div>
                    </div>

                    {/* Selected Photos Preview */}
                    <div style={{marginTop: '30px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px'}}>
                      <h3 style={{marginTop: 0}}>📷 Photos partagées ({selectedPhotos.size})</h3>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginTop: '15px'}}>
                        {searchResults.filter(r => selectedPhotos.has(r.photo_id)).map((photo, idx) => (
                          <div key={photo.photo_id} style={{position: 'relative'}}>
                            <img 
                              src={`http://localhost:8000/uploads/photos/${photo.filename}`}
                              alt={`Photo ${idx + 1}`}
                              style={{width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #2563EB'}}
                            />
                            <div style={{position: 'absolute', top: '2px', right: '2px', background: '#2563EB', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'}}>
                              {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap'}}>
                  <button 
                    onClick={() => {
                      const text = `Owen'Snap - Vos photos sont prêtes!\n\n${window.location.origin}/share/${shareData.share_code}\n\nCode: ${shareData.share_code}`
                      navigator.clipboard.writeText(text)
                      alert('✅ Lien copié dans le presse-papiers!')
                    }}
                    className="btn-primary"
                    style={{padding: '15px 30px', fontSize: '16px'}}
                  >
                    📋 Copier le lien
                  </button>
                  <button 
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/${shareData.share_code}`
                      window.open(shareUrl, '_blank')
                    }}
                    className="btn-primary"
                    style={{padding: '15px 30px', fontSize: '16px'}}
                  >
                    🌐 Ouvrir dans le navigateur
                  </button>
                  <button 
                    onClick={resetAndStartOver}
                    className="btn-secondary"
                    style={{padding: '15px 30px', fontSize: '16px'}}
                  >
                    🔄 Nouveau scan
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Kiosk
