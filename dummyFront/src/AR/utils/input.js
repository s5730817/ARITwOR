export function getNormalizedPoint(e, canvas) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  if (!rect) return null;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (rect.width === 0 || rect.height === 0) return null;

  return {
    nx: x / rect.width,
    ny: y / rect.height,
  };
}