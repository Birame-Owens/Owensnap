import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { Download, QrCode, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
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
            width: 220,
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 mb-4"></div>
          <p className="text-slate-600 font-light text-sm tracking-wide">Chargement en cours</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">⚠</div>
          <h1 className="text-xl font-light text-slate-900 tracking-tight mb-2">Erreur</h1>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-slate-900 text-white text-sm font-normal hover:bg-black transition-colors">
            Retourner
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-slate-900 tracking-tight">OWEN'SNAP</h1>
              <p className="text-xs text-slate-500 font-normal mt-1">Galerie temporaire</p>
            </div>
            <div className="flex items-center gap-6">
              {!isExpired && (
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                  title="Code QR"
                >
                  <QrCode className="h-5 w-5" />
                </button>
              )}
              <div className={`text-xs font-normal tracking-wide ${
                isExpired ? 'text-red-600' : 
                timeRemaining < 12 ? 'text-orange-600' : 'text-slate-600'
              }`}>
                {isExpired ? 'EXPIRÉ' : `${timeRemaining}H RESTANT`}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* QR Modal */}
        {showQR && (
          <div className="mb-12 bg-white border border-slate-200 p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h3 className="text-sm font-normal text-slate-900 tracking-wide">PARTAGER</h3>
              </div>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-12">
              <div className="flex flex-col items-center justify-center bg-slate-50 p-8 border border-slate-200">
                <canvas 
                  ref={qrCanvasRef}
                  width={220}
                  height={220}
                  style={{ borderRadius: '2px' }}
                />
              </div>
              <div className="flex flex-col justify-center gap-6">
                <div>
                  <p className="text-xs text-slate-600 mb-3 font-normal tracking-wide">LIEN</p>
                  <div className="bg-slate-50 p-4 border border-slate-200">
                    <p className="text-xs font-mono text-slate-700 break-all leading-relaxed">{window.location.href}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Copié');
                  }}
                  className="px-6 py-3 bg-slate-900 text-white text-xs font-normal hover:bg-black transition-colors"
                >
                  Copier le lien
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
          <div className="bg-white border border-slate-200 p-6 text-center hover:border-slate-400 transition-colors">
            <p className="text-2xl font-light text-slate-900">{share.selected_photos.length}</p>
            <p className="text-xs text-slate-600 mt-2 font-normal tracking-wide">PHOTOS</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 text-center hover:border-slate-400 transition-colors">
            <p className="text-2xl font-light text-slate-900">{totalSize}</p>
            <p className="text-xs text-slate-600 mt-2 font-normal tracking-wide">MB</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 text-center hover:border-slate-400 transition-colors">
            <p className="text-2xl font-light text-slate-900">{share.downloads_count}</p>
            <p className="text-xs text-slate-600 mt-2 font-normal tracking-wide">TÉLÉCHARGEMENTS</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 text-center hover:border-slate-400 transition-colors">
            <p className="text-2xl font-light text-slate-900">{isExpired ? '−' : '✓'}</p>
            <p className="text-xs text-slate-600 mt-2 font-normal tracking-wide">{isExpired ? 'EXPIRÉ' : 'ACTIF'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isExpired && (
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={downloadAll}
              disabled={downloading !== null}
              className="flex-1 px-6 py-4 bg-slate-900 text-white text-sm font-normal hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger tout
            </button>
            <button
              onClick={() => navigator.share({ 
                title: 'Galerie photos',
                url: window.location.href 
              })}
              className="flex-1 px-6 py-4 border border-slate-300 bg-white text-slate-900 text-sm font-normal hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </div>
        )}

        {/* Warning */}
        {timeRemaining < 12 && timeRemaining > 0 && !isExpired && (
          <div className="bg-slate-50 border border-slate-200 p-4 mb-12 flex gap-4">
            <span className="text-lg font-light">⏰</span>
            <div>
              <p className="font-normal text-slate-900 text-sm">Attention</p>
              <p className="text-xs text-slate-600">Ce lien expire dans {timeRemaining}h</p>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        <div>
          <h2 className="text-xs font-normal text-slate-600 mb-6 tracking-wide">GALERIE</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {share.selected_photos.map((photo) => (
              <div 
                key={photo._id} 
                className="bg-white border border-slate-200 overflow-hidden group hover:border-slate-400 transition-colors"
              >
                <div className="relative bg-slate-100 aspect-square overflow-hidden">
                  <img
                    src={`http://localhost:8000/api/v1/photos/${photo._id}/thumbnail`}
                    alt="Photo galerie"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {downloadedPhotos.has(photo._id) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <button
                    onClick={() => downloadPhoto(photo._id, photo.filename)}
                    disabled={downloading === photo._id || isExpired}
                    className="w-full py-2 bg-slate-900 text-white text-xs font-normal hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {downloading === photo._id ? (
                      <>
                        <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                        <span className="hidden sm:inline">Télé.</span>
                      </>
                    ) : downloadedPhotos.has(photo._id) ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">OK</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        <span className="hidden sm:inline">Télécharger</span>
                        <span className="sm:hidden">↓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-500 font-light space-y-1">
          <p>PHOTOS HAUTE QUALITÉ • TÉLÉCHARGEMENT SÉCURISÉ</p>
          {!isExpired && <p>ACCÈS DISPONIBLE {timeRemaining}H</p>}
        </div>
      </div>
    </div>
  );
}
