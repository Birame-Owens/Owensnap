import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Users, Share2, Smartphone, Lock, Zap, Mail, Phone, MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import './Home.css';

export default function Home() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-black bg-opacity-80 backdrop-blur-md border-b border-white border-opacity-10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-xl font-light text-white tracking-tight">OWEN'SNAP</div>
          <div className="flex gap-8 text-sm tracking-wide">
            <a href="#comment-ca-marche" className="text-slate-300 hover:text-white transition-colors duration-300">Comment ça marche</a>
            <a href="#a-propos" className="text-slate-300 hover:text-white transition-colors duration-300">À propos</a>
            <a href="#contact" className="text-slate-300 hover:text-white transition-colors duration-300">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.50) 0%, rgba(0, 0, 0, 0.65) 100%), url('/Reconnaissance-Faciale.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Animated gradient orb */}
        {/* Hidden - background image is used instead */}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-slate-400 text-sm tracking-widest mb-6 uppercase">Reconnaissance faciale intelligente</p>
            <h1 className="text-6xl md:text-7xl font-light mb-8 leading-tight">
              Retrouvez vos photos en secondes
            </h1>
            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
              Technologie de reconnaissance faciale automatique pour vos événements. Haute qualité, 
              sécurisé, et d'une simplicité déconcertante.
            </p>
            
            <div className="flex justify-center gap-4">
              <Link 
                to="/kiosk" 
                className="px-8 py-3 bg-white text-black rounded-lg hover:bg-slate-100 transition-all duration-300 flex items-center gap-2 font-medium group"
              >
                Commencer 
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-3 border border-slate-400 text-white hover:bg-slate-900 hover:border-white transition-all duration-300 rounded-lg font-medium">
                En savoir plus
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-24 pt-24 border-t border-slate-700">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <p className="text-4xl font-light mb-2">99%</p>
              <p className="text-slate-400 text-sm tracking-wide">Précision reconnaissance</p>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <p className="text-4xl font-light mb-2">93%</p>
              <p className="text-slate-400 text-sm tracking-wide">Compression espace</p>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <p className="text-4xl font-light mb-2">∞</p>
              <p className="text-slate-400 text-sm tracking-wide">Photos gérées</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-slate-500 text-sm tracking-widest uppercase mb-4">Processus simple</p>
            <h2 className="text-5xl font-light mb-6">Comment ça marche</h2>
            <div className="w-16 h-px bg-black mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'Upload photos', desc: 'Le photographe télécharge les photos en haute qualité' },
              { num: '2', title: 'Événement créé', desc: 'Un code accès unique est généré pour l\'événement' },
              { num: '3', title: 'Scan au kiosk', desc: 'Le client entre le code et scanne son visage' },
              { num: '4', title: 'QR & téléchargement', desc: 'Reçoit un QR code pour accéder ses photos' }
            ].map((step, idx) => (
              <div 
                key={idx}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="group">
                  <div className="h-16 w-16 bg-black text-white rounded-lg flex items-center justify-center font-light text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-medium mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-light">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Avantages */}
          <div className="mt-20 bg-slate-50 rounded-lg border border-slate-200 p-12">
            <h3 className="text-2xl font-light mb-10 tracking-tight">Notre approche</h3>
            <div className="space-y-6">
              {[
                { icon: CheckCircle, title: 'Qualité maximale', desc: 'Zéro dégradation - vos photos restent parfaites' },
                { icon: CheckCircle, title: 'Sécurité garantie', desc: 'Reconnaissance faciale + liens expiration 48h' },
                { icon: CheckCircle, title: 'Accès facile', desc: 'QR code + interface mobile-first optimisée' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <Icon className="h-5 w-5 text-black mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-slate-600 text-sm mt-1 font-light">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Galerie */}
      <section id="galerie" className="py-32 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-slate-400 text-sm tracking-widest uppercase mb-4">Galerie</p>
            <h2 className="text-5xl font-light mb-6">Retrouvez-vous automatiquement</h2>
            <p className="text-slate-400 font-light">Exemple de reconnaissance faciale en action</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="group overflow-hidden rounded-lg">
              <div className="h-80 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <img 
                  src="/WhatsApp Image 2025-12-25 at 15.37.19.jpeg" 
                  alt="Photo trouvée" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <p className="text-slate-300 font-light">Photo détectée automatiquement</p>
                <p className="text-slate-500 text-sm mt-1">Similarité: 98.5%</p>
              </div>
            </div>
            
            <div className="group overflow-hidden rounded-lg">
              <div className="h-80 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <img 
                  src="/Capture d'écran galerie.png" 
                  alt="Interface" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <p className="text-slate-300 font-light">Interface de galerie</p>
                <p className="text-slate-500 text-sm mt-1">Téléchargement en un clic</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Caractéristiques */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-slate-500 text-sm tracking-widest uppercase mb-4">Avantages</p>
            <h2 className="text-5xl font-light">Ce qui nous rend spéciaux</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Camera, title: 'Compression intelligente', desc: 'Réduction de 93% sans perte visible de qualité' },
              { icon: Users, title: 'Reconnaissance faciale', desc: 'Identification automatique avec précision 99%' },
              { icon: Share2, title: 'Partage sécurisé', desc: 'QR codes uniques avec expiration automatique' },
              { icon: Lock, title: 'Confidentialité', desc: 'Accès temporaires et suppression automatique' },
              { icon: Smartphone, title: 'Mobile-first', desc: 'Entièrement optimisé pour tous les appareils' },
              { icon: Zap, title: 'Ultra rapide', desc: 'Upload parallèle et traitement optimisé' }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredFeature(idx)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="p-8 rounded-lg border border-slate-200 hover:border-black transition-all duration-300 group"
                >
                  <Icon className={`h-8 w-8 mb-4 transition-transform duration-300 ${hoveredFeature === idx ? 'scale-110' : ''}`} />
                  <h3 className="text-lg font-medium mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-600 text-sm font-light leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* À propos */}
      <section id="a-propos" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-light mb-6">Owen'Snap</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              Plateforme intelligente de gestion photographique pour événements.
              Reconnaissanceèce faciale automatique, partage sécurisé et téléchargements en haute qualité.
              Les photographes gagnent du temps. Les clients retrouvent leurs photos en secondes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="group">
              <p className="text-5xl font-light mb-3 group-hover:text-slate-900 transition-colors">500+</p>
              <p className="text-slate-600 font-light">Événements gérés</p>
            </div>
            <div className="group">
              <p className="text-5xl font-light mb-3 group-hover:text-slate-900 transition-colors">50k+</p>
              <p className="text-slate-600 font-light">Photos traitées</p>
            </div>
            <div className="group">
              <p className="text-5xl font-light mb-3 group-hover:text-slate-900 transition-colors">1000+</p>
              <p className="text-slate-600 font-light">Utilisateurs satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-32 bg-black text-white relative overflow-hidden">
        {/* Subtle background overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-light mb-6">Nous contacter</h2>
            <p className="text-slate-400 font-light">Vous avez des questions? Nous répondons sous 24h.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto mb-20">
            <div className="group text-center">
              <Mail className="h-8 w-8 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-light tracking-tight mb-3">Email</p>
              <a 
                href="mailto:birameowensdiop@gmail.com" 
                className="text-slate-400 hover:text-white transition-colors text-sm font-light"
              >
                birameowensdiop@gmail.com
              </a>
            </div>

            <div className="group text-center">
              <Phone className="h-8 w-8 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-light tracking-tight mb-3">Téléphone</p>
              <a 
                href="tel:+221771397393" 
                className="text-slate-400 hover:text-white transition-colors text-sm font-light"
              >
                +221 771 39 73 93
              </a>
            </div>

            <div className="group text-center">
              <MapPin className="h-8 w-8 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-light tracking-tight mb-3">Localisation</p>
              <p className="text-slate-400 text-sm font-light">
                Dakar, Sénégal
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-lg border border-slate-800">
            <form className="space-y-4">
              <input 
                type="text" 
                placeholder="Votre nom" 
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-slate-500 font-light transition-all"
              />
              <input 
                type="email" 
                placeholder="Votre email" 
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-slate-500 font-light transition-all"
              />
              <textarea 
                placeholder="Votre message" 
                rows={4}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-slate-500 font-light transition-all"
              />
              <button 
                type="submit"
                className="w-full py-3 bg-white text-black rounded-lg hover:bg-slate-100 transition-colors font-medium tracking-wide"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-800 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center font-light">
          <p>© 2026 Owen'Snap. Tous droits réservés.</p>
          <p className="text-sm mt-2 text-slate-500">Reconnaissance faciale. Sécurisé. Intelligent.</p>
        </div>
      </footer>

      {/* CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
