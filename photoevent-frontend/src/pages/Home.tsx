import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Users, Share2, Smartphone, Lock, Zap, Mail, Phone, MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import './Home.css';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-black">Owen'Snap</div>
          <div className="flex gap-6">
            <a href="#comment-ca-marche" className="text-gray-600 hover:text-black transition">Comment ça marche</a>
            <a href="#a-propos" className="text-gray-600 hover:text-black transition">À propos</a>
            <a href="#contact" className="text-gray-600 hover:text-black transition">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==')]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Owen'Snap - Vos photos d'événements
              <span className="block text-blue-400 mt-2">Trouvez-vous facilement parmi les photos</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Reconnaissance faciale automatique. Retrouvez toutes vos photos en quelques secondes.
              Haute qualité, sécurisé et simple d'utilisation.
            </p>
            <div className="flex justify-center gap-4">
              <Link 
                to="/kiosk" 
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Commencer <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-16 border-t border-gray-700">
            <div className="text-center">
              <Zap className="h-8 w-8 text-blue-400 mx-auto mb-3" />
              <p className="text-3xl font-bold">93%</p>
              <p className="text-gray-400 mt-1">Réduction de stockage</p>
            </div>
            <div className="text-center">
              <Camera className="h-8 w-8 text-blue-400 mx-auto mb-3" />
              <p className="text-3xl font-bold">∞</p>
              <p className="text-gray-400 mt-1">Photos gérées</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-3" />
              <p className="text-3xl font-bold">Auto</p>
              <p className="text-gray-400 mt-1">Reconnaissance faciale</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Comment ça marche</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Étape 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl border-2 border-black h-full">
                <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">1</div>
                <h3 className="text-xl font-bold mb-4">Photographe upload</h3>
                <p className="text-gray-600">
                  Le photographe télécharge les photos de l'événement en haute qualité via l'admin.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 bg-blue-600 rounded-full border-4 border-white transform -translate-y-1/2" />
            </div>

            {/* Étape 2 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl border-2 border-black h-full">
                <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">2</div>
                <h3 className="text-xl font-bold mb-4">Client au kiosk</h3>
                <p className="text-gray-600">
                  Le client entre le code de l'événement et scanne son visage pour identification.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 bg-blue-600 rounded-full border-4 border-white transform -translate-y-1/2" />
            </div>

            {/* Étape 3 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl border-2 border-black h-full">
                <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">3</div>
                <h3 className="text-xl font-bold mb-4">Sélection photos</h3>
                <p className="text-gray-600">
                  Les photos correspondant au visage s'affichent. Le client sélectionne les siennes.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 bg-blue-600 rounded-full border-4 border-white transform -translate-y-1/2" />
            </div>

            {/* Étape 4 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl border-2 border-black h-full">
                <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">4</div>
                <h3 className="text-xl font-bold mb-4">QR code + Récupération</h3>
                <p className="text-gray-600">
                  Un QR code est généré. Le client le scanne pour accéder ses photos sur son téléphone.
                </p>
              </div>
            </div>
          </div>

          {/* Flux détaillé */}
          <div className="mt-16 bg-white p-8 rounded-xl border-2 border-gray-200">
            <h3 className="text-2xl font-bold mb-6">Processus de téléchargement</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Qualité maximale</p>
                  <p className="text-gray-600">Les photos sont téléchargées en haute qualité (aucune dégradation)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Sécurisé par reconnaissance faciale</p>
                  <p className="text-gray-600">Seules les photos où le client est reconnu restent disponibles</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Accès limité dans le temps</p>
                  <p className="text-gray-600">Les liens expirent après 48h pour la confidentialité</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Galerie - Photos trouvées */}
      <section id="galerie" className="py-20 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Retrouvez-vous dans la galerie</h2>
          <p className="text-center text-gray-600 mb-12">Exemple de photos trouvées automatiquement</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img src="/WhatsApp Image 2025-12-25 at 15.37.19.jpeg" alt="Photo trouvée" className="w-full h-96 object-cover" />
              <div className="p-4 bg-white">
                <p className="text-green-600 font-bold">✓ Photo trouvée automatiquement</p>
                <p className="text-gray-600 text-sm mt-1">Reconnaissance faciale: 98.5%</p>
              </div>
            </div>
            
            <div className="rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img src="/Capture d'écran galerie.png" alt="Galerie d'écran" className="w-full h-96 object-cover" />
              <div className="p-4 bg-white">
                <p className="text-blue-600 font-bold">📱 Interface de galerie</p>
                <p className="text-gray-600 text-sm mt-1">Téléchargement haute qualité en un clic</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Caractéristiques */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Pourquoi Owen'Snap ?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Camera className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Compression intelligente</h3>
              <p className="text-gray-600">
                Réduit l'espace de stockage de 93% sans perte significative de qualité visible.
              </p>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Users className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Reconnaissance faciale</h3>
              <p className="text-gray-600">
                Identification automatique des clients dans les photos pour une meilleure expérience.
              </p>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Share2 className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Partage facile</h3>
              <p className="text-gray-600">
                QR code unique pour chaque client. Accès simple et sécurisé à ses photos.
              </p>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Lock className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Sécurité garantie</h3>
              <p className="text-gray-600">
                Liens d'accès temporaires et expiration automatique après 48 heures.
              </p>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Smartphone className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Mobile optimisé</h3>
              <p className="text-gray-600">
                Interface complètement responsive pour une utilisation sur smartphone et tablette.
              </p>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-colors">
              <Zap className="h-10 w-10 text-black mb-4" />
              <h3 className="text-xl font-bold mb-2">Ultra rapide</h3>
              <p className="text-gray-600">
                Upload parallèle et traitement optimisé pour gérer des centaines de photos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section id="a-propos" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-6">À propos d'Owen'Snap</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto text-lg mb-12">
            Owen'Snap est votre gestionnaire intelligent de photos d'événements.
            Reconnaissance faciale automatique, téléchargements haute qualité, et partage sécurisé.
            Les photographes gagnent du temps, les clients trouvent leurs photos en secondes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-black mb-2">500+</p>
              <p className="text-gray-600">Événements gérés</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-black mb-2">50k+</p>
              <p className="text-gray-600">Photos traitées</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-black mb-2">1000+</p>
              <p className="text-gray-600">Utilisateurs satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Nous contacter</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <Mail className="h-8 w-8 text-black mx-auto mb-4" />
              <p className="font-bold mb-2">Email</p>
              <a href="mailto:contact@photoevent.com" className="text-gray-600 hover:text-black">
                contact@photoevent.com
              </a>
            </div>

            <div className="text-center">
              <Phone className="h-8 w-8 text-black mx-auto mb-4" />
              <p className="font-bold mb-2">Téléphone</p>
              <a href="tel:+33612345678" className="text-gray-600 hover:text-black">
                +33 6 12 34 56 78
              </a>
            </div>

            <div className="text-center">
              <MapPin className="h-8 w-8 text-black mx-auto mb-4" />
              <p className="font-bold mb-2">Localisation</p>
              <p className="text-gray-600">
                France
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="mt-12 max-w-md mx-auto bg-white p-8 rounded-xl border-2 border-gray-200">
            <form className="space-y-4">
              <input 
                type="text" 
                placeholder="Votre nom" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input 
                type="email" 
                placeholder="Votre email" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <textarea 
                placeholder="Votre message" 
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button 
                type="submit"
                className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-bold"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Owen'Snap. Tous droits réservés. | La reconnaissance faciale au service des événements.
          </p>
        </div>
      </footer>
    </div>
  );
}
