import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import "./PhotoUpload.css";

interface PhotoUploadProps {
  eventId: number;
  onUploadComplete?: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  eventId,
  onUploadComplete,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverRef = useRef(false);

  const handleFileSelect = (files: FileList) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedFiles((prev) => [
          ...prev,
          {
            file,
            preview: e.target?.result as string,
            id: Math.random().toString(36).substr(2, 9),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = false;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = false;
    if (e.dataTransfer?.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Veuillez sélectionner des photos");
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem("admin_token");

    // Initialiser la progression
    setUploadProgress(
      selectedFiles.map((f) => ({
        fileName: f.file.name,
        progress: 0,
        status: "pending",
      }))
    );

    try {
      // Créer FormData avec toutes les images
      const formData = new FormData();
      selectedFiles.forEach((f) => {
        formData.append("files", f.file);
      });

      // Faire la requête
      const response = await axios.post(
        `/api/v1/admin/events/${eventId}/photos`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );

              setUploadProgress((prev) =>
                prev.map((p, idx) => ({
                  ...p,
                  progress: Math.min(progress, 100),
                  status: progress < 100 ? "uploading" : "success",
                }))
              );
            }
          },
        }
      );

      // Marquer comme succès
      setUploadProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "success",
          progress: 100,
        }))
      );

      toast.success(`✅ ${response.data.message}`);
      setSelectedFiles([]);
      onUploadComplete?.();

      // Réinitialiser après un délai
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Erreur upload";
      toast.error(errorMsg);

      setUploadProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error",
          error: errorMsg,
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="photo-upload-container">
      {/* Drop Zone */}
      <div
        className={`photo-upload-dropzone ${dragOverRef.current ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          style={{ display: "none" }}
        />

        <Upload size={48} className="dropzone-icon" />
        <h3>Glissez vos photos ici</h3>
        <p>ou cliquez pour parcourir</p>
        <button
          type="button"
          className="dropzone-browse-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Sélectionner les photos
        </button>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="photo-upload-previews">
          <h4>{selectedFiles.length} photo(s) sélectionnée(s)</h4>
          <div className="previews-grid">
            {selectedFiles.map((file) => (
              <div key={file.id} className="preview-item">
                <img src={file.preview} alt={file.file.name} />
                <button
                  className="preview-remove-btn"
                  onClick={() => removeFile(file.id)}
                  title="Supprimer"
                >
                  <X size={16} />
                </button>
                <div className="preview-filename">{file.file.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="photo-upload-progress">
          <h4>Progression de l'upload</h4>
          {uploadProgress.map((item, idx) => (
            <div key={idx} className={`upload-item upload-${item.status}`}>
              <div className="upload-info">
                <span className="upload-name">{item.fileName}</span>
                <span className="upload-percent">{item.progress}%</span>
              </div>
              <div className="upload-bar-container">
                <div
                  className="upload-bar"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {item.status === "success" && (
                <div className="upload-icon success">
                  <CheckCircle2 size={16} />
                </div>
              )}
              {item.status === "error" && (
                <div className="upload-icon error">
                  <AlertCircle size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {selectedFiles.length > 0 && !isUploading && uploadProgress.length === 0 && (
        <div className="photo-upload-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              setSelectedFiles([]);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            Uploader {selectedFiles.length} photo(s)
          </button>
        </div>
      )}

      {/* Allow adding more files */}
      {uploadProgress.some((p) => p.status === "success") && (
        <div className="photo-upload-continue">
          <p>Vous pouvez ajouter d'autres photos à cet événement</p>
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Ajouter d'autres photos
          </button>
        </div>
      )}
    </div>
  );
};
