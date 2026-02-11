import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { Download, QrCode, Clock, CheckCircle, AlertCircle, Share2, ArrowRight } from 'lucide-react';
import './Gallery.css';

interface Photo {
  _id: string;
  filename: string;
  file_size: number;
  original_size: number;
  created_at: string;
}

interface Share {
  share_code: string;
  event_id: string;
  face_id: string;
  selected_photos: Photo[];
  created_at: string;
  expires_at: string;
  downloads_count: number;
}

export default function ShareGallery({ shareCode }: { shareCode: string }) {
  const [share, setShare] = useState<Share | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadedPhotos, setDownloadedPhotos] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const API_BASE = 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadShare();
  }, [shareCode]);

  useEffect(() => {
    if (showQR && qrCodeUrl && qrCanvasRef.current) {
      setTimeout(() => {
        if (qrCanvasRef.current && qrCodeUrl) {
          QRCode.toCanvas(qrCanvasRef.current, qrCodeUrl, {
            width: 250,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'H'
          }).catch(err => console.error('QR Error:', err));
        }
      }, 100);
    }
  }, [showQR, qrCodeUrl]);

  const loadShare = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/shares/${shareCode}`);
      setShare(res.data);
      const qrUrl = `http://localhost:3000/share/${shareCode}`;
      setQrCodeUrl(qrUrl);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Code de partage invalide ou expiré');
      } else if (err.response?.status === 410) {
        setError('Ce partage a expiré');
      } else {
        setError('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPhoto = async (photoId: string, filename: string) => {
    try {
      setDownloading(photoId);
      const res = await axios.get(`${API_BASE}/photos/${photoId}/download-hq`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      setDownloadedPhotos(prev => new Set(prev).add(photoId));

      try {
        await axios.post(`${API_BASE}/shares/${shareCode}/track-download?photo_id=${photoId}`);
      } catch (e) {}
    } catch (err) {
      alert('Erreur téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    if (!share) return;
    for (const photo of share.selected_photos) {
      await downloadPhoto(photo._id, photo.filename);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-black mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-red-700 mb-6">{error}</p>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!share) return null;

  const expiresDate = new Date(share.expires_at);
  const isExpired = expiresDate < new Date();
  const timeRemaining = Math.max(0, Math.floor((expiresDate.getTime() - new Date().getTime()) / 1000 / 3600));
  const totalSize = (share.selected_photos.reduce((sum, p) => sum + p.file_size, 0) / 1024 / 1024).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">📸</h1>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-900">Vos photos</h2>
              <p className="text-sm text-slate-500">{share.selected_photos.length} photos • {totalSize} MB</p>
            </div>
            <div className="flex items-center gap-3">
              {!isExpired && (
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="p-3 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  title="QR Code"
                >
                  <QrCode className="h-5 w-5 text-slate-700" />
                </button>
              )}
              <div className={`text-sm font-bold px-4 py-2 rounded-full ${
                isExpired ? 'text-red-600 bg-red-50' : 
                timeRemaining < 12 ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'
              }`}>
                {isExpired ? '⏰ Expiré' : `⏱️ ${timeRemaining}h`}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* QR Modal */}
        {showQR && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">📱 Code QR</h3>
                <p className="text-sm text-slate-600">Scannez pour accéder à vos photos</p>
              </div>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex flex-col items-center justify-center bg-white p-6 rounded-xl border-2 border-blue-300 shadow-sm">
                <canvas 
                  ref={qrCanvasRef}
                  width={250}
                  height={250}
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-2 font-bold uppercase tracking-wide">Lien de partage</p>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <p className="text-xs font-mono text-slate-700 break-all">{window.location.href}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('✓ Lien copié !');
                  }}
                  className="px-4 py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Copier le lien
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors">
            <p className="text-3xl font-bold text-slate-900">{share.selected_photos.length}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">PHOTOS</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors">
            <p className="text-3xl font-bold text-slate-900">{totalSize}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">MB</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors">
            <p className="text-3xl font-bold text-slate-900">{share.downloads_count}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">TÉLÉCHARGEMENTS</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors">
            <p className="text-2xl font-bold text-slate-900">{isExpired ? '❌' : '✓'}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{isExpired ? 'EXPIRÉ' : 'ACTIF'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isExpired && (
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <button
              onClick={downloadAll}
              disabled={downloading !== null}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-slate-900 to-black text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              <Download className="h-5 w-5" />
              Tout télécharger
            </button>
            <button
              onClick={() => navigator.share({ 
                title: 'Vos photos',
                url: window.location.href 
              })}
              className="flex-1 px-6 py-4 border-2 border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 font-bold"
            >
              <Share2 className="h-5 w-5" />
              Partager
            </button>
          </div>
        )}

        {/* Warning */}
        {timeRemaining < 12 && timeRemaining > 0 && !isExpired && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-8 flex gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-bold text-orange-900">Attention!</p>
              <p className="text-sm text-orange-800">Ce lien expire dans {timeRemaining}h</p>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-6">Galerie</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {share.selected_photos.map((photo) => (
              <div 
                key={photo._id} 
                className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 hover:shadow-lg transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative bg-slate-100 aspect-square overflow-hidden">
                  <img
                    src={`http://localhost:8000/api/v1/photos/${photo._id}/thumbnail`}
                    alt={photo.filename}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  {downloadedPhotos.has(photo._id) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  )}
                </div>

                {/* Info & Action */}
                <div className="p-4">
                  <button
                    onClick={() => downloadPhoto(photo._id, photo.filename)}
                    disabled={downloading === photo._id || isExpired}
                    className="w-full py-3 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
                  >
                    {downloading === photo._id ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span className="hidden sm:inline">Téléchargement</span>
                      </>
                    ) : downloadedPhotos.has(photo._id) ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Téléchargée</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 group-hover/btn:scale-125 transition-transform" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t-2 border-slate-200 text-center text-sm text-slate-600">
          <p className="font-medium">
            📸 Photos haute qualité • ✓ Téléchargement sécurisé • {!isExpired && `⏱️ ${timeRemaining}h disponible`}
          </p>
        </div>
      </div>
    </div>
  );
}
