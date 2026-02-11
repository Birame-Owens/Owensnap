import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import QRCode from 'qrcode'
import './Kiosk.css'
import { Download, Share2, Plus, Settings } from 'lucide-react'

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

  useEffect(() => {
    if (stream && videoRef.current && cameraActive) {
      videoRef.current.srcObject = stream
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Erreur play():', err)
          })
        }
      }
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }
    }
  }, [stream, cameraActive])

  const startCamera = async () => {
    if (!eventCode.trim()) {
      setError('Veuillez entrer un code événement')
      return
    }

    setError('')
    setLoading(true)

    try {
      await axios.get(`http://localhost:8000/api/v1/events/code/${eventCode.toUpperCase()}`)
      
      try {
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(mediaStream)
        setCameraActive(true)
        setError('')
        setLoading(false)
      } catch (cameraError: any) {
        setLoading(false)
        setError(`Caméra indisponible: ${cameraError.message || 'Vérifiez les permissions.'}`)
      }
    } catch (error: any) {
      setLoading(false)
      setError(`Code événement "${eventCode.toUpperCase()}" introuvable.`)
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
      setError('Caméra non prête. Veuillez réessayer.')
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
        setError('Aucune photo trouvée. Assurez-vous d\'être bien face à la caméra avec un bon éclairage.')
      }
    } catch (error: any) {
      console.error('Erreur recherche:', error)
      setError(error.response?.data?.detail || error.message || 'Erreur lors de la recherche')
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

  const generateShareCode = async () => {
    if (selectedPhotos.size === 0) {
      setError('Veuillez sélectionner au moins une photo')
      return
    }

    setGeneratingShare(true)
    setError('')

    try {
      const eventsResponse = await axios.get(`http://localhost:8000/api/v1/events/code/${eventCode.toUpperCase()}`)
      const event = eventsResponse.data

      const payload = {
        event_id: event.id,
        face_id: 'auto_detected',
        selected_photo_ids: Array.from(selectedPhotos)
      }

      const response = await axios.post('http://localhost:8000/api/v1/shares', payload)

      const shareCode = response.data.share_code
      const shareUrl = `http://localhost:3000/share/${shareCode}`

      setShareData({
        share_code: shareCode,
        expires_at: response.data.expires_at,
        photos_count: selectedPhotos.size
      })

      setTimeout(async () => {
        if (qrCanvasRef.current) {
          try {
            await QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
              width: 220,
              margin: 2,
              color: {dark: '#000000', light: '#FFFFFF'},
              errorCorrectionLevel: 'H'
            })
          } catch (qrError: any) {
            console.error('Erreur génération QR:', qrError)
          }
        }
      }, 100)
    } catch (error: any) {
      console.error('Erreur génération share:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Erreur inconnue'
      setError(`Erreur : ${errorMsg}`)
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-slate-900 tracking-tight">OWEN'SNAP</h1>
            <p className="text-xs text-slate-500 font-normal mt-1">Kiosque photos</p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-xs text-slate-600 hover:text-slate-900 font-normal tracking-wide"
          >
            RETOUR
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!cameraActive ? (
          /* SETUP PHASE */
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="w-full max-w-md">
              <div className="bg-white border border-slate-200 p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-light text-slate-900 tracking-tight mb-2">Retrouvez vos photos</h2>
                  <p className="text-sm text-slate-600 font-normal">Reconnaissance faciale en direct</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <label className="block">
                    <span className="text-xs text-slate-700 font-normal tracking-wide mb-2 block">CODE ÉVÉNEMENT</span>
                    <input
                      type="text"
                      placeholder="Exemple: JK0LHAWK"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && startCamera()}
                      className="w-full px-4 py-3 border border-slate-300 text-sm font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                    />
                  </label>
                </div>
                
                {error && (
                  <div className="mb-6 bg-slate-50 border border-slate-200 p-4">
                    <p className="text-sm text-slate-900">{error}</p>
                  </div>
                )}
                
                <button 
                  onClick={startCamera} 
                  disabled={!eventCode.trim() || loading}
                  className="w-full py-3 bg-slate-900 text-white font-normal text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Vérification...' : 'Démarrer la caméra'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CAMERA PHASE */
          <div className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Camera Preview */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 overflow-hidden">
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
                        <div className="absolute inset-0 border-2 border-slate-300 rounded-full opacity-50"></div>
                        <div className="absolute inset-8 border border-slate-300 rounded-full opacity-30"></div>
                      </div>
                    </div>

                    {loading && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center">
                          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3"></div>
                          <p className="text-white text-sm font-normal">Recherche en cours...</p>
                        </div>
                      </div>
                    )}

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Side Info */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 p-6">
                  <p className="text-xs text-slate-600 font-normal tracking-wide mb-3">ÉVÉNEMENT</p>
                  <p className="text-lg font-mono text-slate-900">{eventCode}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-xs text-slate-600 font-normal">
                    <p>✓ Caméra activée</p>
                    <p>✓ Prêt à scanner</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-6">
                  <p className="text-xs text-slate-600 font-normal tracking-wide mb-3">STATISTIQUES</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Résultats</span>
                      <span className="font-normal text-slate-900">{searchResults.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sélectionnées</span>
                      <span className="font-normal text-slate-900">{selectedPhotos.size}</span>
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
                className="flex-1 py-3 bg-slate-900 text-white font-normal text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Recherche...' : 'Capturer et chercher'}
              </button>
              <button 
                onClick={stopCamera} 
                className="px-8 py-3 border border-slate-300 bg-white text-slate-900 font-normal text-sm hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>

            {error && (
              <div className="bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm text-slate-900">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* RESULTS PHASE */}
        {searchResults.length > 0 && !shareData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 border border-slate-200 p-8">
              <div>
                <h2 className="text-2xl font-light text-slate-900 tracking-tight">{searchResults.length} photo{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</h2>
                <p className="text-sm text-slate-600 font-normal mt-2">Ajustez le seuil de similarité pour affiner les résultats</p>
              </div>
            </div>

            {/* Similarity Filter */}
            <div className="bg-white border border-slate-200 p-6">
              <label className="block mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-normal text-slate-900 text-sm">Seuil de similarité</span>
                  <span className="text-lg font-mono text-slate-900 px-3 py-1 bg-slate-50 border border-slate-200">{(similarityThreshold * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05" 
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-300 rounded-full appearance-none cursor-pointer accent-slate-900"
                />
              </label>
              <p className="text-xs text-slate-600 font-normal">
                {searchResults.filter(r => r.similarity >= similarityThreshold).length} photo{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 's' : ''} affichée{searchResults.filter(r => r.similarity >= similarityThreshold).length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Photos Grid */}
            <div>
              <h3 className="text-xs text-slate-600 font-normal mb-6 tracking-wide">GALERIE</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.filter(r => r.similarity >= similarityThreshold).map((result, index) => (
                  <div 
                    key={`${result.photo_id}-${index}`}
                    onClick={() => togglePhotoSelection(result.photo_id)}
                    className={`group relative bg-white border overflow-hidden cursor-pointer transition-all ${
                      selectedPhotos.has(result.photo_id) 
                        ? 'border-slate-900' 
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="relative bg-slate-100 aspect-square overflow-hidden">
                      <img 
                        src={`http://localhost:8000/uploads/photos/${result.filename}`}
                        alt="Résultat"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 right-2">
                        <input 
                          type="checkbox"
                          checked={selectedPhotos.has(result.photo_id)}
                          onChange={() => {}}
                          className="w-5 h-5 border border-white accent-slate-900 cursor-pointer"
                        />
                      </div>

                      {/* Similarity Badge */}
                      <div className="absolute bottom-2 left-2 bg-slate-900 text-white font-mono text-xs px-2 py-1">
                        {(result.similarity * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedPhotos.size > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 sticky bottom-0 bg-white border-t border-slate-200 pt-6">
                <button 
                  onClick={generateShareCode}
                  disabled={generatingShare}
                  className="flex-1 py-3 bg-slate-900 text-white font-normal text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingShare ? 'Génération...' : `Générer code pour ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`}
                </button>
                <button 
                  onClick={() => setSelectedPhotos(new Set())}
                  className="px-6 py-3 border border-slate-300 bg-white text-slate-900 font-normal text-sm hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {/* SHARE CONFIRMATION PHASE */}
        {shareData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-200 p-12">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-light text-slate-900 tracking-tight mb-2">Code de partage généré</h2>
                <p className="text-sm text-slate-600 font-normal">Partagez ce code avec vos proches</p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 mb-12">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-8">
                  <h3 className="font-normal text-slate-900 mb-6 text-sm">SCANNER LE CODE QR</h3>
                  <div className="bg-white p-4 border border-slate-900">
                    <canvas 
                      ref={qrCanvasRef} 
                      width={220}
                      height={220}
                    />
                  </div>
                </div>

                {/* Share Info */}
                <div className="space-y-4">
                  {/* Code Display */}
                  <div className="bg-slate-50 border border-slate-200 p-6">
                    <p className="text-xs text-slate-600 font-normal mb-3 tracking-wide">CODE DE PARTAGE</p>
                    <p className="text-3xl font-mono text-slate-900 text-center py-4 px-4 border border-slate-200 bg-white mb-4">
                      {shareData.share_code}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareData.share_code);
                        alert('Copié');
                      }}
                      className="w-full py-2 bg-slate-900 text-white font-normal text-xs hover:bg-black transition-all"
                    >
                      Copier le code
                    </button>
                  </div>

                  {/* Share Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 text-center">
                      <p className="text-2xl font-light text-slate-900">{shareData.photos_count}</p>
                      <p className="text-xs text-slate-600 mt-1 font-normal tracking-wide">PHOTOS</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 text-center">
                      <p className="text-2xl font-light text-slate-900">48</p>
                      <p className="text-xs text-slate-600 mt-1 font-normal tracking-wide">HEURES</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos Preview */}
              <div className="bg-slate-50 border border-slate-200 p-6 mb-8">
                <h3 className="font-normal text-slate-900 mb-4 text-sm">PHOTOS ({selectedPhotos.size})</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {searchResults.filter(r => selectedPhotos.has(r.photo_id)).map((photo, idx) => (
                    <div key={photo.photo_id} className="relative">
                      <img 
                        src={`http://localhost:8000/uploads/photos/${photo.filename}`}
                        alt={`Photo ${idx + 1}`}
                        className="w-full aspect-square object-cover border border-slate-200"
                      />
                      <div className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-normal">
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
                  className="py-3 bg-slate-900 text-white font-normal text-sm hover:bg-black transition-all"
                >
                  Ouvrir le lien
                </button>
                <button 
                  onClick={() => {
                    const text = `Owen'Snap - Vos photos!\n${window.location.origin}/share/${shareData.share_code}\nCode: ${shareData.share_code}`
                    navigator.clipboard.writeText(text)
                    alert('Copié')
                  }}
                  className="py-3 border border-slate-300 bg-white text-slate-900 font-normal text-sm hover:bg-slate-50 transition-all"
                >
                  Copier tout
                </button>
                <button 
                  onClick={resetAndStartOver}
                  className="py-3 border border-slate-300 bg-white text-slate-900 font-normal text-sm hover:bg-slate-50 transition-all"
                >
                  Nouveau scan
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
