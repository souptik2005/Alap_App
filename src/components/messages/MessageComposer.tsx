import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip,
  SendHorizonal,
  Smile,
  Loader2,
  Image as ImageIcon,
  FileText,
  Film,
  FileUp,
  AlertCircle,
  X,
  Reply,
  Pencil,
  Check,
} from 'lucide-react';
import { Message, StagedMediaFile, RepliedMessagePreview } from '../../types';
import { validateMediaFile } from '../../lib/storageService';
import { MediaStagingModal } from './MediaStagingModal';

interface MessageComposerProps {
  onSendMessage: (
    text: string,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => Promise<void> | void;
  onSendMediaMessage?: (
    file: File,
    caption: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newText: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
}

const EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '😊', '😍', '👏', '🙏', '✨', '🙌', '💯'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendMediaMessage,
  onTyping,
  replyingToMessage = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  onSaveEdit,
  placeholder = 'Write a message...',
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stagedFile, setStagedFile] = useState<StagedMediaFile | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTyping) {
        onTyping(false);
      }
      if (stagedFile?.previewUrl && stagedFile.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(stagedFile.previewUrl);
      }
    };
  }, [onTyping, stagedFile]);

  const stageSelectedFile = (file: File) => {
    setValidationError(null);
    setShowAttachmentMenu(false);

    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file selected');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedFile({
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      category: validation.category,
      caption: text.trim(),
      uploadProgress: 0,
      isUploading: false,
      error: null,
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          stageSelectedFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      stageSelectedFile(files[0]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onTyping) {
      onTyping(false);
    }

    try {
      setIsSending(true);

      if (editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage.id, trimmed);
        onCancelEdit?.();
        setText('');
      } else {
        let replyPreview: RepliedMessagePreview | null = null;
        if (replyingToMessage) {
          replyPreview = {
            id: replyingToMessage.id,
            senderId: replyingToMessage.senderId,
            senderName:
              replyingToMessage.senderProfile?.display_name ||
              replyingToMessage.senderProfile?.username ||
              'Member',
            text: replyingToMessage.text || '',
            messageType: replyingToMessage.messageType || 'text',
            fileName: replyingToMessage.fileName || null,
          };
        }

        await onSendMessage(trimmed, replyingToMessage?.id || null, replyPreview);
        setText('');
        onCancelReply?.();
      }

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleSendStagedMedia = async (caption: string) => {
    if (!stagedFile || !onSendMediaMessage) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStagedFile((prev) =>
      prev ? { ...prev, isUploading: true, uploadProgress: 10, error: null, caption } : null
    );

    let replyPreview: RepliedMessagePreview | null = null;
    if (replyingToMessage) {
      replyPreview = {
        id: replyingToMessage.id,
        senderId: replyingToMessage.senderId,
        senderName:
          replyingToMessage.senderProfile?.display_name ||
          replyingToMessage.senderProfile?.username ||
          'Member',
        text: replyingToMessage.text || '',
        messageType: replyingToMessage.messageType || 'text',
        fileName: replyingToMessage.fileName || null,
      };
    }

    try {
      await onSendMediaMessage(
        stagedFile.file,
        caption,
        (progress) => {
          setStagedFile((prev) => (prev ? { ...prev, uploadProgress: progress } : null));
        },
        controller.signal,
        replyingToMessage?.id || null,
        replyPreview
      );

      if (stagedFile.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(stagedFile.previewUrl);
      }
      setStagedFile(null);
      setText('');
      onCancelReply?.();
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setStagedFile((prev) => (prev ? { ...prev, isUploading: false, uploadProgress: 0 } : null));
      } else {
        setStagedFile((prev) =>
          prev
            ? {
                ...prev,
                isUploading: false,
                error: err.message || 'Failed to upload media. Please try again.',
              }
            : null
        );
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (editingMessage) {
        onCancelEdit?.();
        setText('');
      } else if (replyingToMessage) {
        onCancelReply?.();
      }
    }
  };

  const openPickerWithAccept = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
    setShowAttachmentMenu(false);
  };

  const canSend = text.trim().length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-t border-slate-200 bg-white px-6 py-3.5 ${
        isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-500 ring-inset' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            stageSelectedFile(files[0]);
          }
        }}
      />

      {validationError && (
        <div className="max-w-3xl mx-auto mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="p-1 text-red-500 hover:text-red-800 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
        {replyingToMessage && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="p-1 rounded-md bg-indigo-100 text-indigo-600 shrink-0">
                <Reply className="w-3.5 h-3.5 rotate-180" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-indigo-900 truncate">
                  Replying to{' '}
                  {replyingToMessage.senderProfile?.display_name ||
                    replyingToMessage.senderProfile?.username ||
                    'message'}
                </p>
                <p className="text-indigo-700/80 truncate text-[11px]">
                  {replyingToMessage.text ||
                    (replyingToMessage.fileName ? `📎 ${replyingToMessage.fileName}` : 'Attachment')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {editingMessage && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 truncate">Editing message</p>
                <p className="text-amber-700/80 truncate text-[11px]">{editingMessage.text}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onCancelEdit?.();
                setText('');
              }}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {!editingMessage && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu((prev) => !prev)}
                disabled={disabled || isSending}
                aria-label="Attach a file"
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors duration-150 ease-out hover:bg-amber-50 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer disabled:opacity-40"
              >
                <Paperclip className="h-5 w-5" aria-hidden="true" />
              </button>

              {showAttachmentMenu && (
                <div className="absolute bottom-14 left-0 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 min-w-[210px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Send Media & Files
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => openPickerWithAccept('image/*')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Photos & Images</p>
                        <p className="text-[10px] text-slate-400">PNG, JPG, WebP, GIF, SVG</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPickerWithAccept('video/*')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                        <Film className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Videos</p>
                        <p className="text-[10px] text-slate-400">MP4, WebM, MOV</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPickerWithAccept('.pdf')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">PDF Document</p>
                        <p className="text-[10px] text-slate-400">Adobe PDF Document</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openPickerWithAccept(
                          '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.md'
                        )
                      }
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                        <FileUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">All Documents & Files</p>
                        <p className="text-[10px] text-slate-400">Word, Excel, Zip, Text, etc.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isDraggingOver
                  ? 'Drop file here...'
                  : editingMessage
                  ? 'Edit your message...'
                  : placeholder
              }
              disabled={disabled || isSending}
              aria-label="Write a message"
              className="max-h-40 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-11 text-[14.5px] leading-6 text-slate-800 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
            />

            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              className={`absolute right-2.5 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 ease-out cursor-pointer ${
                emojiOpen ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-600'
              }`}
            >
              <Smile className="h-5 w-5" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute bottom-14 right-0 z-10 grid w-56 grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setEmojiOpen(false);
                      }}
                      aria-label={`Insert ${emoji}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-[background-color,transform] duration-150 ease-out hover:bg-slate-100 active:scale-90 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend || disabled || isSending}
            whileTap={canSend ? { scale: 0.92 } : undefined}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            aria-label={editingMessage ? 'Save edit' : 'Send message'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer ${
              canSend
                ? editingMessage
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : editingMessage ? (
              <Check className="h-5 w-5 text-white" />
            ) : (
              <SendHorizonal className="h-5 w-5" aria-hidden="true" />
            )}
          </motion.button>
        </div>

        <p className="mt-2 text-center text-[10.5px] leading-4 text-slate-400">
          Press <span className="font-semibold text-slate-500">Enter</span> to send •{' '}
          <span className="font-semibold text-slate-500">Shift + Enter</span> for a new line
        </p>
      </div>

      {stagedFile && (
        <MediaStagingModal
          stagedFile={stagedFile}
          onCancel={() => setStagedFile(null)}
          onSend={handleSendStagedMedia}
          onAbortUpload={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }}
        />
      )}
    </div>
  );
};
