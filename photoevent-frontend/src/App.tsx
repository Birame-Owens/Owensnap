import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kiosk from './pages/Kiosk'
import Gallery from './pages/Gallery'
import AdminPanel from './pages/AdminPanel'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminEvents from './pages/AdminEvents'
import AdminPhotos from './pages/AdminPhotos'
import AdminStatistics from './pages/AdminStatistics'
import './App.css'

// Protected route component for admin pages
function ProtectedRoute({ element }: { element: React.ReactElement }) {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    return <Navigate to="/admin/login" replace />
  }
  return element
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
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
        <Route path="/admin/events" element={<ProtectedRoute element={<AdminEvents />} />} />
        <Route path="/admin/photos" element={<ProtectedRoute element={<AdminPhotos />} />} />
        <Route path="/admin/statistics" element={<ProtectedRoute element={<AdminStatistics />} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
