import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 512;

export default function AvatarCropModal({ file, onCancel, onComplete }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!file) return undefined;

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      imageRef.current = image;
      setImageLoaded(true);
    };
    image.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageLoaded) return;

    const context = canvas.getContext('2d');
    const baseScale = Math.max(VIEWPORT_SIZE / image.width, VIEWPORT_SIZE / image.height);
    const scale = baseScale * zoom;
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    const maxX = Math.max(0, (drawnWidth - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (drawnHeight - VIEWPORT_SIZE) / 2);
    const x = (VIEWPORT_SIZE - drawnWidth) / 2 + Math.max(-maxX, Math.min(maxX, offset.x));
    const y = (VIEWPORT_SIZE - drawnHeight) / 2 + Math.max(-maxY, Math.min(maxY, offset.y));

    context.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
    context.drawImage(image, x, y, drawnWidth, drawnHeight);
  }, [imageLoaded, offset, zoom]);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.offset.x + event.clientX - drag.x,
      y: drag.offset.y + event.clientY - drag.y
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleZoomChange = (event) => {
    setZoom(Number(event.target.value));
    setOffset({ x: 0, y: 0 });
  };

  const handleComplete = () => {
    const source = imageRef.current;
    if (!source || !imageLoaded) return;

    const output = document.createElement('canvas');
    output.width = OUTPUT_SIZE;
    output.height = OUTPUT_SIZE;
    const context = output.getContext('2d');
    const baseScale = Math.max(VIEWPORT_SIZE / source.width, VIEWPORT_SIZE / source.height);
    const scale = baseScale * zoom * (OUTPUT_SIZE / VIEWPORT_SIZE);
    const drawnWidth = source.width * scale;
    const drawnHeight = source.height * scale;
    const maxX = Math.max(0, (drawnWidth - OUTPUT_SIZE) / 2);
    const maxY = Math.max(0, (drawnHeight - OUTPUT_SIZE) / 2);
    const x = (OUTPUT_SIZE - drawnWidth) / 2 + Math.max(-maxX, Math.min(maxX, offset.x * (OUTPUT_SIZE / VIEWPORT_SIZE)));
    const y = (OUTPUT_SIZE - drawnHeight) / 2 + Math.max(-maxY, Math.min(maxY, offset.y * (OUTPUT_SIZE / VIEWPORT_SIZE)));

    context.drawImage(source, x, y, drawnWidth, drawnHeight);
    output.toBlob((blob) => {
      if (!blob) return;
      onComplete(new File([blob], 'profile-avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <button type="button" aria-label="Close photo cropper" onClick={onCancel} className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="avatar-crop-title" className="text-base font-semibold text-gray-900 dark:text-white">Adjust profile photo</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Drag to position and zoom to fit the circle.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel photo crop" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto h-[280px] w-[280px] touch-none overflow-hidden rounded-full bg-gray-100 ring-4 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="h-full w-full cursor-grab active:cursor-grabbing"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Minus className="h-4 w-4 text-gray-500" />
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={handleZoomChange} aria-label="Photo zoom" className="w-full accent-blue-600" />
          <Plus className="h-4 w-4 text-gray-500" />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
          <button type="button" onClick={handleComplete} disabled={!imageLoaded} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Check className="h-4 w-4" />
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
