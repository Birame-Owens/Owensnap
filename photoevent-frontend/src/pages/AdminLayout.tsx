import React, { useState } from "react";
import { AdminSidebar } from "../components/AdminSidebar";
import { EventModal } from "../components/EventModal";
import "./AdminLayout.css";

interface AdminLayoutProps {
  children: React.ReactNode;
  onEventCreated?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  onEventCreated,
}) => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const handleEventCreated = () => {
    setIsEventModalOpen(false);
    if (onEventCreated) {
      onEventCreated();
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar onCreateEvent={() => setIsEventModalOpen(true)} />

      <main className="admin-layout-content">
        {children}
      </main>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
};
