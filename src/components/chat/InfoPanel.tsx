import React from 'react';
import { motion } from 'framer-motion';
import { X, Bell, Pin, Image as ImageIcon, Users, ShieldCheck, Copy, Check } from 'lucide-react';
import { Conversation, User } from '../../types';
import { accentOf } from '../../utils/accents';
import { Avatar } from '../ui/Avatar';

interface InfoPanelProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
  onLeaveGroup?: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  conversation,
  currentUser,
  onClose,
  onLeaveGroup,
}) => {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  const accent = accentOf(conversation.accent, conversation.id);
  const isGroup = conversation.type === 'group';

  const otherParticipant =
    conversation.otherUser ||
    conversation.participants.find((p) => p.id !== currentUser.id) ||
    conversation.participants[0] || {
      id: 'unknown',
      name: conversation.name,
      email: '',
      avatar: conversation.avatar || '',
    };

  const displayName = isGroup ? conversation.name : otherParticipant.name;
  const displayAvatar = isGroup ? conversation.avatar : otherParticipant.avatar;

  const handleCopyCode = () => {
    if (conversation.inviteCode) {
      navigator.clipboard.writeText(conversation.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      aria-label="Conversation details"
      className="flex w-full md:w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white h-full overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
        <h2 className="text-[11px] font-bold uppercase leading-5 tracking-[0.08em] text-slate-500">
          Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 px-4 pb-5 pt-6 text-center">
        <Avatar
          src={displayAvatar}
          name={displayName}
          size="lg"
          className="mb-2"
        />
        <p className="text-[17px] font-semibold leading-6 tracking-tight text-slate-900">
          {displayName}
        </p>
        <p className="text-[12.5px] leading-5 text-slate-500">
          {isGroup ? `${conversation.participants.length} members` : 'Direct message'}
        </p>
      </div>

      {isGroup && conversation.inviteCode && (
        <div className="mx-4 mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Group Access Code
              </p>
              <p className="text-sm font-mono font-bold text-indigo-900 tracking-widest mt-0.5">
                {conversation.inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 px-4">
        <div className="rounded-xl px-2 py-2.5 text-center bg-indigo-50 text-indigo-700">
          <dt className="text-[9.5px] font-bold uppercase leading-4 tracking-wide opacity-70">
            Type
          </dt>
          <dd className="text-[15px] font-bold leading-6 capitalize">{conversation.type}</dd>
        </div>
        <div className="rounded-xl px-2 py-2.5 text-center bg-emerald-50 text-emerald-700">
          <dt className="text-[9.5px] font-bold uppercase leading-4 tracking-wide opacity-70">
            Members
          </dt>
          <dd className="text-[17px] font-bold leading-6 tabular-nums">
            {conversation.participants.length}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-0.5 px-2">
        <button
          type="button"
          onClick={() => setMuted((prev) => !prev)}
          aria-pressed={muted}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left text-[13.5px] font-semibold leading-5 text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 cursor-pointer"
        >
          <Bell className={`h-4 w-4 shrink-0 ${muted ? 'text-slate-400' : 'text-amber-500'}`} aria-hidden="true" />
          {muted ? 'Notifications muted' : 'Notifications on'}
        </button>

        {isGroup && (
          <div className="px-2 pt-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Group Members
            </p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {conversation.participants.map((member) => (
                <li key={member.id} className="flex items-center gap-2 text-xs text-slate-700">
                  <Avatar src={member.avatar} name={member.name} size="sm" />
                  <span className="truncate flex-1 font-medium">{member.name}</span>
                  {member.id === currentUser.id && (
                    <span className="text-[10px] text-slate-400 font-normal">You</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isGroup && onLeaveGroup && (
          <div className="p-2 pt-4">
            <button
              type="button"
              onClick={onLeaveGroup}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Leave Group
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
