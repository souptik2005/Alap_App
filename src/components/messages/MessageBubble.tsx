import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Maximize2,
  Copy,
  Check as CheckIcon,
  MoreVertical,
  Reply,
  Trash2,
  Ban,
  Pencil,
} from 'lucide-react';
import { Message, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { MediaLightbox } from './MediaLightbox';
import { MessageContextMenu, ContextMenuPosition } from './MessageContextMenu';
import { formatBytes, downloadMediaFile } from '../../lib/storageService';
import { copyTextToClipboard, copyImageToClipboard } from '../../lib/chatService';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  sender?: User;
  showAvatar?: boolean;
  isGroup?: boolean;
  searchQuery?: string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

import { motion } from 'framer-motion';

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  sender,
  showAvatar = true,
  isGroup = false,
  searchQuery = '',
  onReply,
  onEdit,
  onDelete,
  onScrollToMessage,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedType, setCopiedType] = useState<'text' | 'image' | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);

  const isSelf = message.senderId === currentUserId;
  const isRead = message.status === 'read';
  const isDeleted = Boolean(message.deletedAt);
  const hasFile = Boolean(message.fileUrl) && !isDeleted;
  const fileName = message.fileName || 'Attachment';
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic', 'avif'];
  const videoExtensions = ['mp4', 'webm', 'mov', 'ogg', 'm4v'];

  const resolvedMsgType =
    message.messageType === 'image' || imageExtensions.includes(ext)
      ? 'image'
      : message.messageType === 'video' || videoExtensions.includes(ext)
        ? 'video'
        : message.messageType === 'pdf' || ext === 'pdf'
          ? 'pdf'
          : hasFile
            ? 'file'
            : message.messageType || 'text';

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!message.fileUrl || isDownloading || isDeleted) return;
    try {
      setIsDownloading(true);
      await downloadMediaFile(message.fileUrl, fileName);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!message.text || isDeleted) return;
    const success = await copyTextToClipboard(message.text);
    if (success) {
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!message.fileUrl || isDeleted) return;
    const res = await copyImageToClipboard(message.fileUrl);
    if (res.success) {
      setCopiedType('image');
      setTimeout(() => setCopiedType(null), 2000);
    } else {
      handleDownload(e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleOpenMenuButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPos({
      x: isSelf ? rect.left - 150 : rect.right,
      y: rect.bottom + 4,
    });
  };

  const getDocIcon = () => {
    if (resolvedMsgType === 'pdf' || ext === 'pdf') {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
          <FileArchive className="w-5 h-5" />
        </div>
      );
    }
    if (['json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'md', 'txt', 'xml'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
          <FileCode className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
        <File className="w-5 h-5" />
      </div>
    );
  };

  const senderDisplayName =
    sender?.name || (message.senderProfile?.display_name || message.senderProfile?.username) || 'Member';

  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) {
      return text;
    }
    const query = searchQuery.trim();
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-amber-300 text-slate-950 px-0.5 rounded-xs font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <motion.div
        id={`message-${message.id}`}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        onContextMenu={handleContextMenu}
        className={`message-bubble group relative flex flex-col w-full my-1.5 transition-colors ${isSelf ? 'items-end' : 'items-start'
          }`}
      >
        <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[75%] md:max-w-[65%] relative">
          {!isSelf && showAvatar && (
            <div className="mb-1 shrink-0">
              <Avatar
                src={sender?.avatar || (message.senderProfile?.avatar_url || undefined)}
                name={senderDisplayName}
                size="sm"
              />
            </div>
          )}

          <div
            className={`relative flex flex-col overflow-hidden shadow-2xs ${isDeleted
                ? isSelf
                  ? 'bg-indigo-950/20 border border-indigo-200/50 text-indigo-900/70 rounded-2xl rounded-br-md'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl rounded-bl-md'
                : isSelf
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md selection:bg-indigo-700 selection:text-white'
                  : 'bg-white text-slate-900 rounded-2xl rounded-bl-md border border-slate-200 selection:bg-slate-200'
              }`}
          >
            {/* Sender display name for group messages */}
            {isGroup && !isSelf && !isDeleted && (
              <div className="px-3.5 pt-2 pb-0.5 text-[11px] font-bold text-indigo-600">
                {senderDisplayName}
              </div>
            )}

            {/* Quoted Replied Message Preview Banner */}
            {message.replyToMessage && !isDeleted && (
              <div
                onClick={() => message.replyToId && onScrollToMessage?.(message.replyToId)}
                className={`mx-2 mt-2 p-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90 flex flex-col gap-0.5 border-l-3 ${isSelf
                    ? 'bg-indigo-700/70 border-white/60 text-white/90'
                    : 'bg-slate-100/90 border-indigo-500 text-slate-700'
                  }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <Reply className="w-3 h-3 rotate-180 opacity-70" />
                  <span className={isSelf ? 'text-indigo-100' : 'text-indigo-600'}>
                    {message.replyToMessage.senderId === currentUserId
                      ? 'You'
                      : message.replyToMessage.senderName || 'Replied message'}
                  </span>
                </div>
                <div className="text-xs truncate opacity-85 font-normal">
                  {message.replyToMessage.text ||
                    (message.replyToMessage.fileName ? `📎 ${message.replyToMessage.fileName}` : 'Attachment')}
                </div>
              </div>
            )}

            {/* State A: Deleted Message Tombstone */}
            {isDeleted ? (
              <div className="flex items-center gap-2 px-4 py-2.5 text-xs italic opacity-85">
                <Ban className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span>This message was deleted</span>
              </div>
            ) : (
              <>
                {/* 1. Image Media Card */}
                {resolvedMsgType === 'image' && message.fileUrl && (
                  <div
                    className="relative group/img cursor-pointer overflow-hidden max-w-sm rounded-t-xl bg-slate-900/10"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img
                      src={message.fileUrl}
                      alt={fileName}
                      className="max-h-[300px] w-full object-cover group-hover/img:scale-[1.02] transition-transform duration-200"
                      loading="lazy"
                    />
                    {/* Hover overlay with action icons */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLightboxOpen(true);
                        }}
                        aria-label="View Fullscreen"
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors cursor-pointer"
                        title="Open full preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyImage}
                        aria-label="Copy Image"
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors cursor-pointer"
                        title="Copy image"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        aria-label="Download Image"
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors cursor-pointer"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Video Media Card */}
                {resolvedMsgType === 'video' && message.fileUrl && (
                  <div className="relative max-w-sm overflow-hidden rounded-t-xl bg-black">
                    <video
                      src={message.fileUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[300px] w-full object-contain"
                    />
                  </div>
                )}

                {/* 3. PDF / Document Card */}
                {(resolvedMsgType === 'pdf' || resolvedMsgType === 'document' || resolvedMsgType === 'file') && message.fileUrl && (
                  <div
                    className={`p-3 flex items-center gap-3 min-w-[240px] max-w-sm ${isSelf
                        ? 'bg-indigo-700/60 border-b border-indigo-500/30'
                        : 'bg-slate-50/80 border-b border-slate-100'
                      }`}
                  >
                    {getDocIcon()}
                    <div className="flex-1 min-w-0 pr-1">
                      <p
                        className={`font-semibold text-xs truncate ${isSelf ? 'text-white' : 'text-slate-900'
                          }`}
                        title={fileName}
                      >
                        {fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className={isSelf ? 'text-indigo-200' : 'text-slate-500 font-medium'}>
                          {message.fileSize ? formatBytes(message.fileSize) : 'Document'}
                        </span>
                        <span className={isSelf ? 'text-indigo-300' : 'text-slate-400'}>•</span>
                        <span
                          className={`uppercase font-bold tracking-wider text-[9px] px-1 py-0.2 rounded ${isSelf
                              ? 'bg-indigo-800 text-indigo-200'
                              : 'bg-slate-200/80 text-slate-600'
                            }`}
                        >
                          {ext || 'FILE'}
                        </span>
                      </div>
                    </div>

                    {/* Document Actions: Download & Open */}
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open document in new tab"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSelf
                            ? 'hover:bg-indigo-800 text-indigo-100 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        title="Open document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        aria-label="Download Document"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSelf
                            ? 'hover:bg-indigo-800 text-indigo-100 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Text Content / Caption */}
                {message.text && (
                  <div
                    className={`px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${hasFile ? 'pt-2' : 'py-2.5'
                      }`}
                  >
                    {renderHighlightedText(message.text)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action trigger & Quick hover controls */}
          {!isDeleted && (
            <div
              className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center shrink-0 ${isSelf ? 'order-first flex-row-reverse' : 'order-last flex-row'
                }`}
            >
              {/* Quick Reply button */}
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  title="Reply"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Quick Copy button */}
              {message.text && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  title="Copy text"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer transition-colors"
                >
                  {copiedType === 'text' ? (
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {/* Context menu button (3 dots) */}
              <button
                type="button"
                onClick={handleOpenMenuButton}
                title="More actions"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Copied Toast Notice */}
        {copiedType && (
          <div
            className={`text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5 shadow-2xs animate-in fade-in ${isSelf ? 'self-end mr-1' : 'self-start ml-10'
              }`}
          >
            {copiedType === 'text' ? 'Message copied!' : 'Image copied to clipboard!'}
          </div>
        )}

        {/* Timestamp, Edited Indicator & Status checks */}
        <div
          className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1 px-1 ${isSelf ? 'self-end mr-1' : 'self-start ml-10'
            }`}
        >
          <span>{message.timestamp}</span>

          {/* Edited indicator */}
          {message.editedAt && !isDeleted && (
            <span
              className="text-[10px] text-slate-400 italic flex items-center gap-0.5"
              title="This message was edited"
            >
              <Pencil className="w-2.5 h-2.5 opacity-60" />
              (edited)
            </span>
          )}

          {isSelf && !isDeleted && (
            message.status === 'read' ? (
              <CheckCheck
                className="w-3.5 h-3.5 text-blue-500 shrink-0"
                aria-label="Read"
              />
            ) : message.status === 'delivered' ? (
              <CheckCheck
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                aria-label="Delivered"
              />
            ) : (
              <Check
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                aria-label="Sent"
              />
            )
          )}
        </div>
      </motion.div>

      {/* Context Menu Popover */}
      <MessageContextMenu
        message={message}
        currentUserId={currentUserId}
        position={contextMenuPos}
        isOpen={Boolean(contextMenuPos)}
        onClose={() => setContextMenuPos(null)}
        onReply={(msg) => onReply?.(msg)}
        onEdit={(msg) => onEdit?.(msg)}
        onDelete={(msg) => onDelete?.(msg)}
        onCopy={(msg) => (msg.text ? handleCopyText() : handleCopyImage())}
        onDownload={hasFile ? (msg) => handleDownload() : undefined}
      />

      {/* Lightbox for Images */}
      {resolvedMsgType === 'image' && message.fileUrl && !isDeleted && (
        <MediaLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          mediaUrl={message.fileUrl}
          fileName={fileName}
          fileSize={message.fileSize ? formatBytes(message.fileSize) : undefined}
          senderName={isSelf ? 'You' : senderDisplayName}
          timestamp={message.timestamp}
        />
      )}
    </>
  );
};
