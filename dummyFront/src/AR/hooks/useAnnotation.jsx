import { useEffect, useRef } from "react";
import "./styles/annotationMode.css";

function AnnotationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw center circle
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      const radius = 50;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.stroke();
    };

    draw();
  }, []);

  return <canvas ref={canvasRef} className="annotation-canvas" />;
}

export default AnnotationCanvas;