import React, { useEffect, useRef } from 'react';
import {
  Reply,
  Copy,
  Edit2,
  Trash2,
  Info,
  Check,
  CheckCheck,
  Download,
} from 'lucide-react';
import { Message } from '../../types';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface MessageContextMenuProps {
  message: Message;
  currentUserId: string;
  position: ContextMenuPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onCopy: (message: Message) => void;
  onDownload?: (message: Message) => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  currentUserId,
  position,
  isOpen,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onDownload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelf = message.senderId === currentUserId;
  const isDeleted = Boolean(message.deletedAt);
  const isTextMessage = (message.messageType || 'text') === 'text' && !message.fileUrl;
  const canEdit = isSelf && isTextMessage && !isDeleted;
  const canDelete = isSelf && !isDeleted;
  const hasFile = Boolean(message.fileUrl);

  // Close on outside click or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  // Ensure menu stays within viewport
  const menuWidth = 190;
  const menuHeight = 220;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.min(Math.max(10, position.x), screenWidth - menuWidth - 10);
  const top = Math.min(Math.max(10, position.y), screenHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 min-w-[180px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
    >
      <div className="py-1">
        {/* Reply Action */}
        <button
          type="button"
          onClick={() => {
            onReply(message);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
        >
          <Reply className="w-4 h-4 text-indigo-600" />
          <span>Reply</span>
        </button>

        {/* Copy Action */}
        {!isDeleted && (
          <button
            type="button"
            onClick={() => {
              onCopy(message);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
          >
            <Copy className="w-4 h-4 text-slate-500" />
            <span>{hasFile ? 'Copy Link / Info' : 'Copy Text'}</span>
          </button>
        )}

        {/* Download Action (if attachment exists) */}
        {!isDeleted && hasFile && onDownload && (
          <button
            type="button"
            onClick={() => {
              onDownload(message);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download File</span>
          </button>
        )}
      </div>

      {/* Edit & Delete Section (Only available for own messages) */}
      {(canEdit || canDelete) && (
        <div className="py-1">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(message);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-indigo-500" />
              <span>Edit Message</span>
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(message);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer font-medium"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete Message</span>
            </button>
          )}
        </div>
      )}

      {/* Message Info footer */}
      <div className="px-3.5 py-2 text-[11px] text-slate-400 bg-slate-50/50 flex items-center justify-between">
        <span>{message.timestamp}</span>
        {isSelf && (
          <span className="flex items-center gap-1">
            {message.status === 'read' ? (
              <span className="text-indigo-600 font-medium flex items-center gap-0.5">
                <CheckCheck className="w-3 h-3" /> Read
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Sent
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};
