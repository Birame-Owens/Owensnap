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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📸</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Owen'Snap</h1>
              <p className="text-xs text-slate-500 font-medium">Reconnaissance faciale instantanée</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded-lg transition-colors"
          >
            ← Retour
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!cameraActive ? (
          /* SETUP PHASE */
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4 animate-bounce" style={{animationDuration: '2s'}}>📷</div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Retrouvez vos photos</h2>
                  <p className="text-slate-600 text-sm">Reconnaissance faciale intelligente en direct</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700 mb-2 block uppercase tracking-wide">📌 Code événement</span>
                    <input
                      type="text"
                      placeholder="Ex: JK0LHAWK"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && startCamera()}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg font-mono text-lg font-bold focus:border-slate-900 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-center"
                    />
                  </label>
                </div>
                
                {error && (
                  <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-bold text-red-900">{error}</p>
                      <p className="text-xs text-red-700 mt-1">Vérifiez votre code et réessayez</p>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={startCamera} 
                  disabled={!eventCode.trim() || loading}
                  className="w-full py-4 bg-gradient-to-r from-slate-900 to-black text-white font-bold text-lg rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Vérification en cours...
                    </>
                  ) : (
                    <>🎬 Démarrer la caméra</>
                  )}
                </button>

                <div className="mt-6 pt-6 border-t-2 border-slate-200">
                  <p className="text-xs text-slate-500 text-center">
                    ✓ Accès caméra requis • 🔒 Données sécurisées • ⚡ Résultats instantanés
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CAMERA PHASE */
          <div className="space-y-8">
            {/* Video Section */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Camera Preview */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
                  <div className="relative bg-slate-900 aspect-video overflow-hidden">
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
                        display: 'block'
                      }}
                    />
                    
                    {/* Face Guide */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <div className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-pulse" style={{boxShadow: '0 0 0 2px rgba(250, 204, 21, 0.3)'}}></div>
                        <div className="absolute inset-2 border-2 border-yellow-300 rounded-full opacity-50"></div>
                      </div>
                    </div>

                    {/* Loading Indicator */}
                    {loading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center">
                          <div className="animate-spin h-12 w-12 border-4 border-yellow-400 border-t-white rounded-full mx-auto mb-3"></div>
                          <p className="text-white font-bold">Recherche en cours...</p>
                        </div>
                      </div>
                    )}

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>

                  {/* Instructions */}
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-50 border-t-2 border-yellow-200 p-4 flex gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-bold text-slate-900">Conseil</p>
                      <p className="text-xs text-slate-700">Placez votre visage au centre du cercle avec bon éclairage</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Info */}
              <div className="space-y-4">
                {/* Event Info */}
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-6">
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">👥 Événement actif</p>
                  <p className="text-2xl font-bold text-slate-900 font-mono">{eventCode}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">✓ Caméra activée</p>
                    <p className="text-sm text-slate-600">✓ Prêt à scanner</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 shadow-md p-6">
                  <p className="text-sm font-bold text-blue-900 mb-3">📊 Stats en direct</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Résultats</span>
                      <span className="font-bold text-blue-900">{searchResults.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Sélectionnées</span>
                      <span className="font-bold text-blue-900">{selectedPhotos.size}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={captureAndSearch} 
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-slate-900 to-black text-white font-bold text-lg rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Recherche...
                  </>
                ) : (
                  <>✨ Capturer et chercher</>
                )}
              </button>
              <button 
                onClick={stopCamera} 
                className="px-8 py-4 border-2 border-slate-300 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                ✕ Annuler
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-2xl">🔴</span>
                <div>
                  <p className="font-bold text-red-900">{error}</p>
                  <p className="text-xs text-red-700 mt-1">Vérifiez l'éclairage et réessayez</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS PHASE */}
        {searchResults.length > 0 && !shareData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-300 p-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">✅ {searchResults.length} photo{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</h2>
                <p className="text-sm text-slate-700 mt-2">Ajustez le seuil de similarité pour affiner les résultats</p>
              </div>
              {selectedPhotos.size > 0 && (
                <div className="bg-blue-600 text-white rounded-lg px-6 py-3 font-bold text-lg text-center">
                  {selectedPhotos.size} sélectionné{selectedPhotos.size > 1 ? 'es' : 'e'}
                </div>
              )}
            </div>

            {/* Similarity Filter */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md">
              <label className="block mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-900 text-lg">🎯 Seuil de similarité</span>
                  <span className="text-2xl font-bold text-slate-900 px-4 py-2 bg-slate-100 rounded-lg">
                    {(similarityThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05" 
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(248, 113, 113), rgb(250, 204, 21), rgb(74, 222, 128)) right / ${100 - (similarityThreshold * 100)}% 100% no-repeat`
                  }}
                />
              </label>
              <p className="text-sm text-slate-600 mt-3">
                <strong>{searchResults.filter(r => r.similarity >= similarityThreshold).length}</strong> photo{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 's' : ''} affichée{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Photos Grid */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">📷 Galerie</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.filter(r => r.similarity >= similarityThreshold).map((result, index) => (
                  <div 
                    key={`${result.photo_id}-${index}`}
                    onClick={() => togglePhotoSelection(result.photo_id)}
                    className={`group relative bg-white border-3 rounded-xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 ${
                      selectedPhotos.has(result.photo_id) 
                        ? 'border-blue-600 shadow-xl' 
                        : 'border-slate-200 hover:border-slate-400 shadow-md'
                    }`}
                  >
                    <div className="relative bg-slate-100 aspect-square overflow-hidden">
                      <img 
                        src={`http://localhost:8000/uploads/photos/${result.filename}`}
                        alt="Résultat reconnaissance"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f5f5f5" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="64">📸</text></svg>'
                        }}
                      />
                      
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 right-2">
                        <input 
                          type="checkbox"
                          checked={selectedPhotos.has(result.photo_id)}
                          onChange={() => {}}
                          className="w-6 h-6 rounded border-2 border-white accent-blue-600 cursor-pointer shadow-lg"
                        />
                      </div>

                      {/* Similarity Badge */}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white font-bold px-3 py-1 rounded-full text-sm">
                        {(result.similarity * 100).toFixed(0)}%
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-sm">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadPhoto(result.filename)
                          }}
                          className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center font-bold text-lg hover:bg-slate-100 transition-all transform hover:scale-110 shadow-lg"
                          title="Télécharger"
                        >
                          ⬇️
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            printPhoto(result.filename)
                          }}
                          className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center font-bold text-lg hover:bg-slate-100 transition-all transform hover:scale-110 shadow-lg"
                          title="Imprimer"
                        >
                          🖨️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedPhotos.size > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 sticky bottom-0 bg-gradient-to-t from-white to-white/80 backdropfilter pt-6 pb-4">
                <button 
                  onClick={generateShareCode}
                  disabled={generatingShare}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
                >
                  {generatingShare ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Génération...
                    </>
                  ) : (
                    <>🔗 Générer code pour {selectedPhotos.size} photo{selectedPhotos.size > 1 ? 's' : ''}</>
                  )}
                </button>
                <button 
                  onClick={() => setSelectedPhotos(new Set())}
                  className="px-6 py-4 border-2 border-slate-300 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  🔄 Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {/* SHARE CONFIRMATION PHASE */}
        {shareData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-xl p-8 sm:p-12">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4 animate-bounce" style={{animationDuration: '1.5s'}}>✨</div>
                <h2 className="text-4xl font-bold text-slate-900 mb-2">Code de partage généré!</h2>
                <p className="text-slate-700 text-lg">Partagez ce code avec vos proches</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center bg-white rounded-xl border-2 border-green-200 shadow-md p-8">
                  <h3 className="font-bold text-slate-900 mb-6 text-lg">📱 Scanner le QR Code</h3>
                  <div className="bg-white p-4 rounded-lg border-4 border-blue-600 shadow-lg">
                    <canvas 
                      ref={qrCanvasRef} 
                      width={280}
                      height={280}
                      style={{
                        borderRadius: '6px',
                        display: 'block'
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-4 text-center">☝️ Scannez avec un smartphone</p>
                </div>

                {/* Share Info */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-6">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">🔗 Code de partage</p>
                    <p className="text-4xl font-mono font-bold text-blue-600 text-center py-4 mb-4 px-4 bg-blue-50 rounded-lg">
                      {shareData.share_code}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareData.share_code);
                        alert('✓ Code copié!');
                      }}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      📋 Copier le code
                    </button>
                  </div>

                  {/* Share Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border-2 border-slate-200 shadow-md p-4 text-center">
                      <p className="text-3xl font-bold text-slate-900">{shareData.photos_count}</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">PHOTOS</p>
                    </div>
                    <div className="bg-white rounded-lg border-2 border-slate-200 shadow-md p-4 text-center">
                      <p className="text-3xl font-bold text-slate-900">48</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">HEURES ⏰</p>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-4">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">🌐 Lien complet</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 mb-3">
                      <p className="text-xs font-mono text-slate-700 break-all">{window.location.origin}/share/{shareData.share_code}</p>
                    </div>
                    <button
                      onClick={() => {
                        const text = `Owen'Snap - Vos photos!\n${window.location.origin}/share/${shareData.share_code}`
                        navigator.clipboard.writeText(text);
                        alert('✓ Lien copié!');
                      }}
                      className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition-all text-sm"
                    >
                      📋 Copier le lien
                    </button>
                  </div>
                </div>
              </div>

              {/* Photos Preview */}
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-6 mb-8">
                <h3 className="font-bold text-slate-900 mb-4">📷 Photos partagées ({selectedPhotos.size})</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {searchResults.filter(r => selectedPhotos.has(r.photo_id)).map((photo, idx) => (
                    <div key={photo.photo_id} className="relative group">
                      <img 
                        src={`http://localhost:8000/uploads/photos/${photo.filename}`}
                        alt={`Photo ${idx + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-blue-600 shadow-md group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareData.share_code}`
                    window.open(shareUrl, '_blank')
                  }}
                  className="py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  🌐 Ouvrir le lien
                </button>
                <button 
                  onClick={() => {
                    const text = `Owen'Snap - Vos photos sont prêtes!\n\n${window.location.origin}/share/${shareData.share_code}\n\nCode: ${shareData.share_code}`
                    navigator.clipboard.writeText(text)
                    alert('✅ Lien copié!')
                  }}
                  className="py-4 border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  📋 Copier tout
                </button>
                <button 
                  onClick={resetAndStartOver}
                  className="py-4 border-2 border-slate-300 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  🔄 Nouveau scan
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Kiosk
