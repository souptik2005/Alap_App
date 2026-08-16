import React from 'react';
import { motion } from 'framer-motion';
import { Conversation } from '../../types';
import { Avatar } from '../ui/Avatar';
import { accentOf } from '../../utils/accents';

interface ChatListItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const accent = accentOf(conversation.accent, conversation.id);
  const isGroup = conversation.type === 'group';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={isActive ? 'true' : undefined}
        className={`relative flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-left outline-none transition-all duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive ? accent.soft : 'hover:bg-slate-50'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="conversation-marker"
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full ${accent.solid}`}
          />
        )}

        <span className="relative shrink-0">
          <Avatar
            src={conversation.avatar}
            name={conversation.name}
            size="lg"
            isOnline={isGroup ? undefined : conversation.isOnline}
          />
          {conversation.isOnline && !isGroup && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14.5px] font-semibold leading-5 tracking-tight text-slate-900">
              {conversation.name}
            </span>
            {isGroup && conversation.currentUserRole === 'admin' && (
              <span className={`shrink-0 rounded px-1.5 py-px text-[9.5px] font-bold uppercase leading-4 tracking-wide ${accent.soft} ${accent.text}`}>
                Admin
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[12.5px] leading-5 text-slate-500">
            <span className="truncate">
              {conversation.lastMessage ? (
                <>
                  {conversation.lastMessage.senderName && (
                    <span className="font-medium text-slate-700">
                      {conversation.lastMessage.senderName}:{' '}
                    </span>
                  )}
                  {conversation.lastMessage.text}
                </>
              ) : (
                'No messages yet'
              )}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] font-medium leading-5 tabular-nums text-slate-400">
            {conversation.lastMessage?.timestamp || conversation.updatedAt}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          )}
        </span>
      </button>
    </li>
  );
};
