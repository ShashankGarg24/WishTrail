import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';

const PREVIEW_WIDTH = 560;
const PREVIEW_HEIGHT = 224;
const OUTPUT_WIDTH = 1400;
const OUTPUT_HEIGHT = 560;

export default function CoverCropModal({ file, onCancel, onComplete }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { imageRef.current = image; setLoaded(true); };
    image.src = objectUrl;
    return () => { URL.revokeObjectURL(objectUrl); imageRef.current = null; setLoaded(false); };
  }, [file]);

  const getPlacement = (width, height) => {
    const image = imageRef.current;
    const multiplier = width / PREVIEW_WIDTH;
    const baseScale = Math.max(width / image.width, height / image.height);
    const scale = baseScale * zoom;
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    const maxX = Math.max(0, (drawnWidth - width) / 2);
    const maxY = Math.max(0, (drawnHeight - height) / 2);
    return {
      drawnWidth,
      drawnHeight,
      x: (width - drawnWidth) / 2 + Math.max(-maxX, Math.min(maxX, offset.x * multiplier)),
      y: (height - drawnHeight) / 2 + Math.max(-maxY, Math.min(maxY, offset.y * multiplier))
    };
  };

  useEffect(() => {
    if (!loaded || !canvasRef.current || !imageRef.current) return;
    const context = canvasRef.current.getContext('2d');
    const placement = getPlacement(PREVIEW_WIDTH, PREVIEW_HEIGHT);
    context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    context.drawImage(imageRef.current, placement.x, placement.y, placement.drawnWidth, placement.drawnHeight);
  }, [loaded, offset, zoom]);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({ x: drag.offset.x + event.clientX - drag.x, y: drag.offset.y + event.clientY - drag.y });
  };

  const handleComplete = () => {
    if (!loaded || !imageRef.current) return;
    const output = document.createElement('canvas');
    output.width = OUTPUT_WIDTH;
    output.height = OUTPUT_HEIGHT;
    const placement = getPlacement(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    output.getContext('2d').drawImage(imageRef.current, placement.x, placement.y, placement.drawnWidth, placement.drawnHeight);
    output.toBlob((blob) => {
      if (blob) onComplete(new File([blob], 'profile-cover.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cover-crop-title">
      <button type="button" aria-label="Close cover editor" onClick={onCancel} className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-canvas">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h2 id="cover-crop-title" className="font-semibold text-gray-900 dark:text-white">Adjust cover photo</h2><p className="mt-1 text-xs text-gray-500">Drag the image to crop it and use the slider to magnify.</p></div>
          <button type="button" onClick={onCancel} aria-label="Cancel cover editing" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        <div className="aspect-[5/2] w-full touch-none overflow-hidden rounded-xl bg-gray-100 ring-2 ring-gray-200 dark:bg-surface dark:ring-gray-700">
          <canvas ref={canvasRef} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className="h-full w-full cursor-grab active:cursor-grabbing" />
        </div>
        <div className="mt-5 flex items-center gap-3"><Minus className="h-4 w-4 text-gray-500" /><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Cover magnification" className="w-full accent-blue-600" /><Plus className="h-4 w-4 text-gray-500" /></div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-line dark:text-muted">Cancel</button><button type="button" onClick={handleComplete} disabled={!loaded} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" />Use photo</button></div>
      </div>
    </div>
  );
}
