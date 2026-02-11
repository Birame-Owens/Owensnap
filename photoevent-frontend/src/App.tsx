import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kiosk from './pages/Kiosk'
import Gallery from './pages/Gallery'
import ShareGallery from './pages/ShareGallery'
import AdminPanel from './pages/AdminPanel'
import './App.css'

// Wrapper pour extraire le shareCode depuis les params
function ShareGalleryWrapper() {
  const { shareCode } = useParams<{ shareCode: string }>()
  return shareCode ? <ShareGallery shareCode={shareCode} /> : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/kiosk/*" element={<Kiosk />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/share/:shareCode" element={<ShareGalleryWrapper />} />
        
        {/* Admin Panel */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
