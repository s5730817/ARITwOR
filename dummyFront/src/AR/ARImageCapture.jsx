import React, { useEffect, useRef, useState } from "react";
import "./ARImageCapture.css";
import { captureImage } from "./captureImage";
import { uploadImages } from "../api";

function ARImageCapture() {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [images, setImages] = useState([]);
  const [tempImage, setTempImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [sessionName, setSessionName] = useState("");
  const [objectType, setObjectType] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  // Start camera
  useEffect(() => {
    async function startCamera() {
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
      }
    }

    startCamera();
  }, []);

  return (
    <div className="ar-container">

      <h2>AR Camera Capture</h2>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed"
        />

        {/* TEMP PREVIEW */}
        {tempImage && (
          <div className="temp-preview">

            <img src={tempImage.preview} alt="preview" />

            <div className="temp-controls">
              <button onClick={() => {
                setImages(prev => [...prev, tempImage]);
                setTempImage(null);
              }}>
                Keep
              </button>

              <button onClick={() => {
                URL.revokeObjectURL(tempImage.preview);
                setTempImage(null);
              }}>
                Discard
              </button>
            </div>

          </div>
        )}

        {/* SELECTED IMAGE PREVIEW */}
        {selectedImage && (
          <div className="temp-preview">

            <img src={selectedImage.preview} alt="preview" />

            <div className="temp-controls">
              <button onClick={() => setSelectedImage(null)}>
                Close
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Capture button */}
      {!tempImage && !selectedImage && (
        <button
          className="capture-btn"
          onClick={() => captureImage(videoRef, canvasRef, setTempImage)}
        />
      )}

      <canvas ref={canvasRef} className="hidden-canvas" />

      {/* SAVED IMAGES + METADATA */}
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

          {/* Object Type Dropdown */}
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value)}
          >
            <option value="">Select object type</option>
            <option value="vehicle">Vehicle</option>
            <option value="bus_depot">Bus Depot</option>
            <option value="train_platform">Train Platform</option>
          </select>

          {/* Upload Button */}
          <button
            className="upload-btn"
            onClick={() =>
              uploadImages(images, setUploadStatus, sessionName, objectType)
            }
          >
            Send to Backend
          </button>

          {/* Status */}
          {uploadStatus && (
            <p className="upload-status">
              {uploadStatus}
            </p>
          )}

        </div>
      )}

    </div>
  );
}

export default ARImageCapture;