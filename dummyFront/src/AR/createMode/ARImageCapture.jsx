import React, { useEffect, useRef, useState } from "react";
import "./ARImageCapture.css";
import { captureImage } from "./captureImage";
import { uploadImages } from "../services/FeatureMapClient";

function ARImageCapture({ entityId = null })  {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Image State
  const [images, setImages] = useState([]);
  const [tempImage, setTempImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Metadata State
  const [sessionName, setSessionName] = useState("");
  const [objectType, setObjectType] = useState("");

  // UI State
  const [uploadStatus, setUploadStatus] = useState("");

  // -----------------------------
  // Camera Setup
  // -----------------------------
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setUploadStatus("❌ Unable to access camera");
      }
    };

    startCamera();
  }, []);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleCapture = () => {
    captureImage(videoRef, canvasRef, setTempImage);
  };

  const handleKeepImage = () => {
    setImages((prev) => [...prev, tempImage]);
    setTempImage(null);
  };

  const handleDiscardImage = () => {
    URL.revokeObjectURL(tempImage.preview);
    setTempImage(null);
  };

  const handleUpload = () => {
    if (!sessionName || !objectType) {
      setUploadStatus("⚠️ Please provide session name and object type");
      return;
    }

    uploadImages(images, setUploadStatus, sessionName, objectType, entityId);
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="ar-container">
      <h2>AR Camera Capture</h2>

      {/* Camera */}
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed"
        />

        {/* Temporary Image Preview */}
        {tempImage && (
          <div className="temp-preview">
            <img src={tempImage.preview} alt="preview" />

            <div className="temp-controls">
              <button onClick={handleKeepImage}>Keep</button>
              <button onClick={handleDiscardImage}>Discard</button>
            </div>
          </div>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="temp-preview">
            <img src={selectedImage.preview} alt="preview" />

            <div className="temp-controls">
              <button onClick={() => setSelectedImage(null)}>Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Capture Button */}
      {!tempImage && !selectedImage && (
        <button className="capture-btn" onClick={handleCapture} />
      )}

      <canvas ref={canvasRef} className="hidden-canvas" />

      {/* Captured Images + Metadata */}
      {images.length > 0 && (
        <div className="preview-container">
          <h3>Captured Images</h3>

          <div className="preview-row">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.preview}
                alt="captured"
                className="preview-image"
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>

          {/* Session Name */}
          <input
            type="text"
            placeholder="Enter session name"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />

          {/* Object Type */}
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value)}
          >
            <option value="">Select object type</option>
            <option value="vehicle">Vehicle</option>
            <option value="depot">Depot</option>
          </select>

          {/* Upload */}
          <button className="upload-btn" onClick={handleUpload}>
            Send to Backend
          </button>

          {/* Status */}
          {uploadStatus && (
            <p className="upload-status">{uploadStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ARImageCapture;