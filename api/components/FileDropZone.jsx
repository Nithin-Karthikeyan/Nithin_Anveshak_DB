import { useState, useRef } from "react";
import "./FileDropZone.css";

export default function FileDropZone({ file, setFile, preview, setPreview }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const validateFile = (selectedFile) => {
    setError("");

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError("File must be PDF, JPG, or PNG");
      return false;
    }

    if (selectedFile.size > MAX_SIZE) {
      setError("File must be under 10MB");
      return false;
    }

    return true;
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!validateFile(selectedFile)) {
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type === "application/pdf") {
      setPreview({ type: "pdf", name: selectedFile.name });
    } else {
      setPreview({ type: "image", url: URL.createObjectURL(selectedFile) });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current.click();
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="file-drop-zone-container">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {!file ? (
        <div
          className={`drop-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="drop-zone-icon">📄</div>
          <div className="drop-zone-text">
            <p className="drop-zone-main">Drag & Drop or Click to Upload</p>
            <p className="drop-zone-sub">PDF, JPG, PNG (Max 10MB)</p>
          </div>
        </div>
      ) : (
        <div className="file-preview-container">
          <div className="file-preview">
            {preview?.type === "image" ? (
              <img src={preview.url} alt="Preview" className="preview-image" />
            ) : (
              <div className="pdf-preview">
                <div className="pdf-icon">📑</div>
                <p className="pdf-name">{preview?.name}</p>
              </div>
            )}
          </div>
          <button type="button" onClick={removeFile} className="remove-file-btn">
            Remove File
          </button>
        </div>
      )}

      {error && <div className="error-message">⚠️ {error}</div>}
    </div>
  );
}
