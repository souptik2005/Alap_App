import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink } from 'lucide-react';
import { downloadMediaFile } from '../../lib/storageService';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  fileName?: string;
  fileSize?: string;
  senderName?: string;
  timestamp?: string;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  fileName = 'Image',
  fileSize,
  senderName,
  timestamp,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset zoom and rotation when opening or changing media
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen, mediaUrl]);

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !mediaUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadMediaFile(mediaUrl, fileName);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <header
        className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-white z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0 pr-4">
          <h3 className="text-sm font-medium text-slate-100 truncate max-w-xs sm:max-w-md">
            {fileName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {senderName && <span>From {senderName}</span>}
            {senderName && timestamp && <span>•</span>}
            {timestamp && <span>{timestamp}</span>}
            {fileSize && (
              <>
                <span>•</span>
                <span>{fileSize}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            aria-label="Zoom Out"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 font-mono w-10 text-center select-none hidden sm:inline">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            aria-label="Zoom In"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            aria-label="Rotate"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            aria-label="Download Media"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs"
            title="Download original file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in new tab"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden select-none">
        <div
          className="transition-transform duration-150 ease-out max-h-[85vh] max-w-[90vw] flex items-center justify-center"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={mediaUrl}
            alt={fileName}
            className="max-h-[82vh] max-w-[88vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};
