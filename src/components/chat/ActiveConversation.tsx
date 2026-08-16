import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Info,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
} from 'lucide-react';
import { Conversation, Message, User, RepliedMessagePreview } from '../../types';
import { Avatar } from '../ui/Avatar';
import { MessageBubble } from '../messages/MessageBubble';
import { DateDivider } from '../messages/DateDivider';
import { MessageComposer } from '../messages/MessageComposer';
import { formatLastSeen } from '../../lib/utils';
import { GroupInfoModal } from './GroupInfoModal';
import { MessageThreadSkeleton } from './MessageThreadSkeleton';


interface ActiveConversationProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  isLoadingMessages?: boolean;
  messagesError?: string | null;
  typingUser?: string | null;
  onRetryLoadMessages?: () => void;
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
  onEditMessage?: (conversationId: string, messageId: string, newText: string) => Promise<void> | void;
  onDeleteMessage?: (conversationId: string, messageId: string) => Promise<void> | void;
  onTyping?: (isTyping: boolean) => void;
  onBack?: () => void;
  onConversationUpdated?: (updated: Partial<Conversation>) => void;
  onLeaveConversation?: (conversationId: string) => void;
}

export const ActiveConversation: React.FC<ActiveConversationProps> = ({
  conversation,
  messages,
  currentUser,
  isLoadingMessages = false,
  messagesError = null,
  typingUser = null,
  onRetryLoadMessages,
  onSendMessage,
  onSendMediaMessage,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onBack,
  onConversationUpdated,
  onLeaveConversation,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search in conversation state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const isGroup = conversation.type === 'group';

  const otherParticipant =
    conversation.otherUser ||
    conversation.participants.find((p) => p.id !== currentUser.id) ||
    conversation.participants[0] || {
      id: 'unknown',
      name: conversation.name,
      email: '',
      avatar: conversation.avatar || '',
      isOnline: conversation.isOnline,
      lastSeen: conversation.lastSeen,
      statusText: 'Available',
    };

  const displayName =
    conversation.type === 'direct'
      ? otherParticipant.name
      : conversation.name;

  const displayAvatar =
    conversation.type === 'direct'
      ? otherParticipant.avatar
      : conversation.avatar;

  const isOnline =
    conversation.type === 'direct'
      ? Boolean(otherParticipant.isOnline ?? conversation.isOnline)
      : undefined;

  const lastSeenTime = otherParticipant.lastSeen || conversation.lastSeen;

  // Filter messages matching search query
  const matchingMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return messages
      .filter((m) => !m.deletedAt && m.text && m.text.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQuery]);

  // Handle scrolling to search result
  useEffect(() => {
    if (matchingMessageIds.length > 0 && isSearchOpen) {
      const targetId = matchingMessageIds[activeSearchIndex];
      if (targetId) {
        scrollToMessage(targetId);
      }
    }
  }, [activeSearchIndex, matchingMessageIds, isSearchOpen]);

  // Reset search index when match count changes
  useEffect(() => {
    setActiveSearchIndex(0);
  }, [matchingMessageIds.length]);

  // Focus search input when search is opened
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  // Auto-scroll to bottom on new messages if not searching
  useEffect(() => {
    if (!isSearchOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMessages, typingUser, isSearchOpen]);

  // Function to smoothly scroll to and highlight a specific message (WhatsApp-style flash)
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Inject keyframe CSS once
    const STYLE_ID = 'alap-msg-highlight-style';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        @keyframes alap-highlight-flash {
          0%   { background-color: transparent; }
          20%  { background-color: rgba(251, 191, 36, 0.35); border-radius: 16px; }
          60%  { background-color: rgba(251, 191, 36, 0.25); border-radius: 16px; }
          100% { background-color: transparent; }
        }
        .alap-msg-highlight {
          animation: alap-highlight-flash 1.8s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    // Remove any existing highlight first, then apply
    el.classList.remove('alap-msg-highlight');
    // Force reflow so re-adding the class restarts the animation
    void el.getBoundingClientRect();
    el.classList.add('alap-msg-highlight');

    setTimeout(() => {
      el.classList.remove('alap-msg-highlight');
    }, 2000);
  };


  const handleNextSearchResult = () => {
    if (matchingMessageIds.length === 0) return;
    setActiveSearchIndex((prev) => (prev + 1) % matchingMessageIds.length);
  };

  const handlePrevSearchResult = () => {
    if (matchingMessageIds.length === 0) return;
    setActiveSearchIndex((prev) =>
      prev === 0 ? matchingMessageIds.length - 1 : prev - 1
    );
  };

  // Reply handlers
  const handleReplyMessage = (msg: Message) => {
    setReplyingToMessage(msg);
    setEditingMessage(null);
  };

  // Edit handlers
  const handleEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setReplyingToMessage(null);
  };

  const handleSaveEdit = async (messageId: string, newText: string) => {
    if (!onEditMessage) return;
    await onEditMessage(conversation.id, messageId, newText);
    setEditingMessage(null);
  };

  // Delete handlers
  const handleDeleteMessage = (msg: Message) => {
    setMessageToDelete(msg);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete || !onDeleteMessage || isDeleting) return;
    try {
      setIsDeleting(true);
      await onDeleteMessage(conversation.id, messageToDelete.id);
      setMessageToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Go back to chats"
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer md:hidden shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div
              className={`flex items-center gap-3 min-w-0 ${
                isGroup ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
              }`}
              onClick={() => {
                if (isGroup) {
                  setIsGroupInfoOpen(true);
                }
              }}
            >
              <div className="relative shrink-0">
                <Avatar
                  src={displayAvatar}
                  name={displayName}
                  size="md"
                  isOnline={isOnline}
                  className="shrink-0"
                />
                {isGroup && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Users className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-semibold text-base text-slate-900 leading-tight truncate">
                    {displayName}
                  </h2>
                  {conversation.type === 'direct' && otherParticipant.username && (
                    <span className="text-xs text-slate-400 font-normal truncate">
                      @{otherParticipant.username}
                    </span>
                  )}
                  {isGroup && conversation.currentUserRole === 'admin' && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-200">
                      Admin
                    </span>
                  )}
                </div>

                {/* Status Line: Typing -> Online -> Last Seen / Member count */}
                {typingUser ? (
                  <span className="text-xs font-semibold text-indigo-600 truncate flex items-center gap-1.5 animate-pulse">
                    <span className="flex gap-0.5 items-center">
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" />
                    </span>
                    {typingUser} is typing...
                  </span>
                ) : isGroup ? (
                  <span className="text-xs font-medium text-slate-500 truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                    <span>{conversation.participants.length} members</span>
                    <span>• Tap for group info</span>
                  </span>
                ) : isOnline ? (
                  <span className="text-xs font-semibold text-emerald-600 truncate flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                    {formatLastSeen(lastSeenTime)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions: Search toggle & Info */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              aria-label="Search messages"
              title="Search in conversation"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isSearchOpen
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {isGroup && (
              <button
                type="button"
                onClick={() => setIsGroupInfoOpen(true)}
                aria-label="Group Information"
                title="Group Information & Members"
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <Info className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar Sub-Header */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) handlePrevSearchResult();
                    else handleNextSearchResult();
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Search messages..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Match Counter & Prev/Next Navigator */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-1 shrink-0 text-xs text-slate-500 font-medium">
                <span>
                  {matchingMessageIds.length > 0
                    ? `${activeSearchIndex + 1} of ${matchingMessageIds.length}`
                    : 'No matches'}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={handlePrevSearchResult}
                    disabled={matchingMessageIds.length === 0}
                    aria-label="Previous match"
                    title="Previous match (Shift+Enter)"
                    className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSearchResult}
                    disabled={matchingMessageIds.length === 0}
                    aria-label="Next match"
                    title="Next match (Enter)"
                    className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Messages Thread Canvas */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col chat-bg-pattern"
      >
        {/* Security / Notice Badge */}
        <div className="flex justify-center my-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/90 backdrop-blur-xs border border-indigo-100 px-3 py-1.5 rounded-full text-center max-w-sm shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              {isGroup
                ? `Encrypted group messages among ${conversation.participants.length} members`
                : 'Messages are private in this direct conversation'}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingMessages && messages.length === 0 ? (
          <MessageThreadSkeleton />
        ) : messagesError ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3 border border-red-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Failed to load messages</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">{messagesError}</p>
            {onRetryLoadMessages && (
              <button
                type="button"
                onClick={onRetryLoadMessages}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        ) : messages.length === 0 ? (
          /* Empty Messages State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
              <Avatar
                src={displayAvatar}
                name={displayName}
                size="lg"
                isOnline={isOnline}
              />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              {isGroup ? displayName : `Direct Conversation with ${displayName}`}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              {isGroup
                ? 'Welcome to the group! Send a message below to say hello to everyone.'
                : 'No messages yet. Send a message below to start your conversation.'}
            </p>
          </div>
        ) : (
          /* Message History Thread */
          <>
            <DateDivider label="Messages" />
            {messages.map((msg) => {
              const sender = conversation.participants.find(
                (p) => p.id === msg.senderId
              );
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser.id}
                  sender={sender}
                  isGroup={isGroup}
                  searchQuery={isSearchOpen ? searchQuery : ''}
                  onReply={handleReplyMessage}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onScrollToMessage={scrollToMessage}
                />
              );
            })}
          </>
        )}

        {/* Typing indicator bubble inside message thread */}
        {typingUser && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 shadow-2xs py-2 px-3.5 rounded-2xl w-fit my-1.5 transition-all">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
            </span>
            <span className="font-medium text-slate-700">{typingUser} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Composer with Reply & Edit integration */}
      <MessageComposer
        onSendMessage={onSendMessage}
        onSendMediaMessage={onSendMediaMessage}
        onTyping={onTyping}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onSaveEdit={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Delete Message?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to delete this message? This action will remove the message content for everyone in this chat and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Info & Settings Modal */}
      {isGroup && isGroupInfoOpen && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          conversation={conversation}
          currentUserId={currentUser.id}
          onClose={() => setIsGroupInfoOpen(false)}
          onConversationUpdated={(updated) => {
            if (onConversationUpdated && updated) {
              onConversationUpdated(updated);
            }
          }}
          onGroupUpdated={(updated) => {
            if (onConversationUpdated && updated) {
              onConversationUpdated(updated);
            }
          }}
          onLeaveGroup={() => {
            setIsGroupInfoOpen(false);
            if (onLeaveConversation) {
              onLeaveConversation(conversation.id);
            } else if (onBack) {
              onBack();
            }
          }}
          onGroupLeft={(convId) => {
            setIsGroupInfoOpen(false);
            if (onLeaveConversation) {
              onLeaveConversation(convId);
            } else if (onBack) {
              onBack();
            }
          }}
        />
      )}
    </div>
  );
};
