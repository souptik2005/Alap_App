import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Film,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { StagedMediaFile } from '../../types';
import { formatBytes } from '../../lib/storageService';

interface MediaStagingModalProps {
  stagedFile: StagedMediaFile | null;
  onCancel: () => void;
  onSend: (caption: string) => Promise<void>;
  onAbortUpload?: () => void;
}

export const MediaStagingModal: React.FC<MediaStagingModalProps> = ({
  stagedFile,
  onCancel,
  onSend,
  onAbortUpload,
}) => {
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stagedFile) {
      setCaption(stagedFile.caption || '');
      // Focus caption input on open
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [stagedFile]);

  if (!stagedFile) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || stagedFile.isUploading) return;
    try {
      setIsSubmitting(true);
      await onSend(caption);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocIcon = () => {
    const ext = (stagedFile.fileName.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
      return (
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shadow-xs">
          <FileText className="w-7 h-7" />
        </div>
      );
    }
    if (['doc', 'docx', 'rtf'].includes(ext)) {
      return (
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shadow-xs">
          <FileText className="w-7 h-7" />
        </div>
      );
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return (
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-xs">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
          <FileArchive className="w-7 h-7" />
        </div>
      );
    }
    if (['json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'md', 'txt'].includes(ext)) {
      return (
        <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center border border-purple-200 shadow-xs">
          <FileCode className="w-7 h-7" />
        </div>
      );
    }
    return (
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-xs">
        <File className="w-7 h-7" />
      </div>
    );
  };

  const isUploading = stagedFile.isUploading || isSubmitting;
  const uploadPercent = stagedFile.uploadProgress ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h2 id="media-preview-title" className="font-semibold text-sm text-slate-800">
              {stagedFile.category === 'image'
                ? 'Preview Photo'
                : stagedFile.category === 'video'
                ? 'Preview Video'
                : stagedFile.category === 'pdf'
                ? 'Send PDF Document'
                : 'Send Attachment'}
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {stagedFile.category}
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading && !onAbortUpload}
            aria-label="Cancel attachment"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Preview Body Canvas */}
        <div className="p-5 flex flex-col items-center justify-center overflow-y-auto min-h-[180px] max-h-[420px] bg-slate-900/5">
          {stagedFile.category === 'image' ? (
            <div className="relative max-h-[320px] max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-white">
              <img
                src={stagedFile.previewUrl}
                alt={stagedFile.fileName}
                className="max-h-[320px] max-w-full object-contain rounded-xl"
              />
            </div>
          ) : stagedFile.category === 'video' ? (
            <div className="relative max-h-[320px] w-full flex items-center justify-center rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-black">
              <video
                src={stagedFile.previewUrl}
                controls
                className="max-h-[320px] w-full rounded-xl"
              />
            </div>
          ) : (
            <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              {getDocIcon()}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate" title={stagedFile.fileName}>
                  {stagedFile.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">
                    {formatBytes(stagedFile.fileSize)}
                  </span>
                  <span>•</span>
                  <span className="uppercase text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {stagedFile.fileName.split('.').pop() || 'FILE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Metadata Info Bar */}
          {(stagedFile.category === 'image' || stagedFile.category === 'video') && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium truncate max-w-xs">{stagedFile.fileName}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{formatBytes(stagedFile.fileSize)}</span>
            </div>
          )}

          {/* Upload Error Alert */}
          {stagedFile.error && (
            <div className="w-full mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Upload failed</p>
                <p className="mt-0.5">{stagedFile.error}</p>
              </div>
            </div>
          )}

          {/* Upload Progress Tracker */}
          {isUploading && (
            <div className="w-full mt-4 p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-indigo-900 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  {uploadPercent >= 100 ? 'Finalizing upload...' : `Uploading media (${uploadPercent}%)...`}
                </span>
                <span className="font-mono font-semibold text-indigo-700">{uploadPercent}%</span>
              </div>
              <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${Math.max(5, uploadPercent)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with Caption & Action Controls */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-2xs">
            <input
              ref={inputRef}
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption or message (optional)..."
              disabled={isUploading}
              aria-label="Add a caption"
              className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 p-0 focus:ring-0 disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              {isUploading && onAbortUpload ? (
                <button
                  type="button"
                  onClick={onAbortUpload}
                  aria-label="Cancel upload"
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Upload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isUploading}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                >
                  Discard
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading}
              aria-label="Send media"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-white" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
