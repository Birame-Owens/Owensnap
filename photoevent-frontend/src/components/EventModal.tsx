import React, { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import "./EventModal.css";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    date: new Date().toISOString().slice(0, 16),
    location: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        toast.error("Non authentifié");
        return;
      }

      // Convertir la date au format ISO
      const eventDate = new Date(formData.date).toISOString();

      const response = await axios.post(
        "/api/v1/admin/events",
        {
          name: formData.name,
          date: eventDate,
          location: formData.location,
          description: formData.description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success(`✅ Événement créé: ${response.data.code}`);
      setFormData({
        name: "",
        date: new Date().toISOString().slice(0, 16),
        location: "",
        description: "",
      });
      onClose();
      onEventCreated?.();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Erreur création événement";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="event-modal-overlay" onClick={onClose} />
      <div className="event-modal">
        <div className="event-modal-header">
          <h2>Créer un nouvel événement</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-modal-form">
          <div className="form-group">
            <label htmlFor="name">Nom de l'événement *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ex: Mariage de Sarah & Pierre"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date et heure *</label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Lieu</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="ex: Hôtel Radisson Dakar"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Détails supplémentaires..."
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !formData.name}
            >
              {isLoading ? "Création..." : "Créer l'événement"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
