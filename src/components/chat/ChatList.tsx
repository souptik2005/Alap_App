import React, { useState } from 'react';
import { Search, X, Plus, KeyRound, Users, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation } from '../../types';
import { ChatListItem } from './ChatListItem';

import { ChatListSkeleton } from './ChatListSkeleton';

export type ListFilter = 'all' | 'direct' | 'groups';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  isLoading?: boolean;
  onSelectConversation: (id: string) => void;
  onNewChatClick: (tab?: 'direct' | 'group' | 'join') => void;
}

const filterStyles: Record<ListFilter, { on: string; off: string }> = {
  all: { on: 'bg-indigo-600 text-white', off: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
  direct: { on: 'bg-violet-500 text-white', off: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
  groups: { on: 'bg-emerald-500 text-white', off: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
};

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  isLoading = false,
  onSelectConversation,
  onNewChatClick,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const counts = {
    all: conversations.length,
    direct: conversations.filter((c) => c.type === 'direct').length,
    groups: conversations.filter((c) => c.type === 'group').length,
  };

  const filteredConversations = conversations.filter((conversation) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'direct' && conversation.type === 'direct') ||
      (filter === 'groups' && conversation.type === 'group');

    const last = conversation.lastMessage?.text || '';
    const haystack = `${conversation.name} ${last}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <section
      aria-label="Conversations"
      className="relative flex w-full md:w-[360px] h-full shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="space-y-2.5 px-4 pb-3 pt-4 border-b border-slate-100">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-[13.5px] leading-5 text-slate-800 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors duration-150 ease-out hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'direct', 'groups'] as ListFilter[]).map((key) => {
            const isOn = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={isOn}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold leading-4 capitalize outline-none transition-all duration-150 ease-out active:scale-95 cursor-pointer ${isOn ? filterStyles[key].on : filterStyles[key].off
                  }`}
              >
                {key} ({counts[key]})
              </button>
            );
          })}
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2 pb-24">
        {isLoading ? (
          <ChatListSkeleton />
        ) : (
          filteredConversations.map((conv) => (
            <ChatListItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onClick={() => {
                setIsFabMenuOpen(false);
                onSelectConversation(conv.id);
              }}
            />
          ))
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <li className="px-6 py-16 text-center">
            <p className="text-[14px] font-semibold tracking-tight text-slate-700">
              Nothing matches that
            </p>
            <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
              Try another name or clear the search filters.
            </p>
          </li>
        )}
      </ul>

      {/* Floating Action Menu Overlay backdrop */}
      {isFabMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-2xs"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}

      {/* Floating Action Button (New Chat & Groups Menu) */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end gap-2">
        <AnimatePresence>
          {isFabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-end gap-2 mb-2"
            >
              <button
                type="button"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  onNewChatClick('join');
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>Join with Code</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  onNewChatClick('group');
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>New Group</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  onNewChatClick('direct');
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>Direct Chat</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setIsFabMenuOpen((prev) => !prev)}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.12 }}
          aria-label="Start a new conversation"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_14px_28px_-12px_rgba(79,70,229,1)] outline-none transition-colors duration-150 ease-out hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className={`h-6 w-6 transition-transform duration-150 ${isFabMenuOpen ? 'rotate-45' : ''}`} aria-hidden="true" />
        </motion.button>
      </div>
    </section>
  );
};
