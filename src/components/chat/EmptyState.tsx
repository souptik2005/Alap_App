import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquarePlus } from 'lucide-react';

interface EmptyStateProps {
  onStartNewChat?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onStartNewChat }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      className="alap-canvas flex flex-col items-center justify-center h-full w-full p-8 text-center select-none"
    >
      <div className="relative mb-6">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-[0_14px_28px_-12px_rgba(79,70,229,0.9)]">
          <Sparkles className="h-10 w-10" aria-hidden="true" />
        </span>
      </div>

      <h2 className="font-display text-4xl italic text-indigo-700 tracking-tight mb-2">
        Welcome to Alap
      </h2>

      <p className="text-sm text-slate-600 max-w-sm mb-2 leading-relaxed">
        Inspired by the Bengali spirit of <span className="font-semibold text-slate-900">"আড্ডা"</span> — simple, casual gatherings and heartfelt conversations.
      </p>

      <p className="text-xs text-slate-500 max-w-xs mb-8">
        Select a conversation from the sidebar or start a new chat to connect with friends.
      </p>

      {onStartNewChat && (
        <motion.button
          type="button"
          onClick={onStartNewChat}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm shadow-[0_14px_28px_-12px_rgba(79,70,229,1)] hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Start New Chat</span>
        </motion.button>
      )}
    </motion.div>
  );
};
