import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Settings, LogOut, Menu, X, BarChart3, Plus } from "lucide-react";
import "./AdminSidebar.css";

interface AdminSidebarProps {
  onCreateEvent?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onCreateEvent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_refresh_token");
    localStorage.removeItem("admin_name");
    navigate("/admin/login");
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { label: "Dashboard", icon: BarChart3, path: "/admin/dashboard" },
    { label: "Événements", icon: Calendar, path: "/admin/events", badge: true },
    { label: "Paramètres", icon: Settings, path: "/admin/settings" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">🔐</div>
          <h2 className="sidebar-title">Owen Snap</h2>
        </div>

        {/* Create Event Button */}
        <button
          className="sidebar-create-btn"
          onClick={() => {
            onCreateEvent?.();
            setIsOpen(false);
          }}
        >
          <Plus size={18} />
          <span>Créer un événement</span>
        </button>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
            >
              <item.icon size={20} />
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">3</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
};
