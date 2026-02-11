import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { Download, QrCode, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const API_BASE = 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadShare();
  }, [shareCode]);

  // Générer le QR code après que le partage soit chargé
  useEffect(() => {
    if (qrCodeUrl && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, qrCodeUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch((err) => {
        console.error('Erreur génération QR:', err);
      });
    }
  }, [qrCodeUrl]);

  const loadShare = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/shares/${shareCode}`);
      setShare(res.data);

      // Générer le URL du partage partageable
      const qrUrl = `http://localhost:3000/share/${shareCode}`;
      setQrCodeUrl(qrUrl);
    } catch (err: any) {
      console.error('Erreur:', err);
      if (err.response?.status === 404) {
        setError('Code de partage invalide ou expiré');
      } else if (err.response?.status === 410) {
        setError('Ce partage a expiré. Veuillez contacter le photographe.');
      } else {
        setError('Erreur lors du chargement des photos');
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

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      // Marquer comme téléchargée
      setDownloadedPhotos(prev => new Set(prev).add(photoId));

      // Tracker le téléchargement (sans bloquer si erreur)
      try {
        await axios.post(`${API_BASE}/shares/${shareCode}/track-download?photo_id=${photoId}`);
      } catch (trackErr) {
        console.error('Erreur tracking:', trackErr);
        // Continuer même si le tracking échoue
      }
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    if (!share) return;
    for (const photo of share.selected_photos) {
      await downloadPhoto(photo._id, photo.filename);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!share) {
    return null;
  }

  const expiresDate = new Date(share.expires_at);
  const isExpired = expiresDate < new Date();
  const timeRemaining = Math.max(0, Math.floor((expiresDate.getTime() - new Date().getTime()) / 1000 / 3600));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black to-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Vos photos</h1>
          <p className="text-gray-300">
            Retrouvez les photos de votre événement
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Expiration */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-600">Disponibilité</p>
            </div>
            <p className="text-2xl font-bold">
              {isExpired ? 'Expiré' : `${timeRemaining}h`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Expire le {expiresDate.toLocaleString('fr-FR')}
            </p>
          </div>

          {/* Photos */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-600">Photos</p>
            </div>
            <p className="text-2xl font-bold">
              {share.selected_photos.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnées pour vous
            </p>
          </div>

          {/* Taille totale */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Download className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-600">Taille totale</p>
            </div>
            <p className="text-2xl font-bold">
              {(share.selected_photos.reduce((sum, p) => sum + p.file_size, 0) / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Qualité haute
            </p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-12 text-center">
          <QrCode className="h-8 w-8 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">📱 Code QR à scanner</h2>
          <p className="text-gray-600 mb-6">
            Scannez ce QR code ou visitez l'URL ci-dessous sur votre téléphone
          </p>
          <div className="inline-block bg-white p-4 rounded-lg border-2 border-blue-200 mb-6 flex justify-center">
            <canvas 
              ref={qrCanvasRef}
              width={250}
              height={250}
              style={{
                border: '2px solid #e0e7ff',
                borderRadius: '8px'
              }}
            />
          </div>
          <p className="text-sm text-gray-600 font-mono break-all bg-white p-3 rounded border border-gray-200">
            {window.location.origin}/share/{shareCode}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 mb-12 justify-center">
          <button
            onClick={downloadAll}
            disabled={downloading !== null || isExpired}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            Télécharger tout
          </button>
          <button
            onClick={() => navigator.share({ url: window.location.href })}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold"
          >
            Partager le lien
          </button>
        </div>

        {/* Photos Grid */}
        <h2 className="text-2xl font-bold mb-6">Galerie photos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {share.selected_photos.map((photo) => (
            <div key={photo._id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden group hover:border-black transition-colors">
              {/* Thumbnail */}
              <div className="relative bg-gray-100 aspect-square overflow-hidden">
                <img
                  src={`http://localhost:8000/api/v1/photos/${photo._id}/thumbnail`}
                  alt={photo.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
                {downloadedPhotos.has(photo._id) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm text-gray-600 truncate mb-3 font-mono">
                  {photo.filename}
                </p>
                <div className="text-xs text-gray-500 mb-4">
                  <p>Taille: {(photo.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => downloadPhoto(photo._id, photo.filename)}
                  disabled={downloading === photo._id || isExpired}
                  className="w-full py-2 bg-black text-white rounded hover:bg-gray-900 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloading === photo._id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Téléchargement...
                    </>
                  ) : downloadedPhotos.has(photo._id) ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Téléchargée
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Télécharger
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Avertissement expiration */}
        {timeRemaining < 24 && !isExpired && (
          <div className="mt-12 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <p className="text-sm text-yellow-800">
              ⚠️ Ce lien expire dans {timeRemaining} heure(s). Téléchargez vos photos rapidement !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
