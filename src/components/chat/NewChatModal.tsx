import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  User as UserIcon,
  MessageSquarePlus,
  Users,
  KeyRound,
} from 'lucide-react';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { searchRegisteredUsers } from '../../lib/chatService';
import { useAuth } from '../../context/AuthContext';
import { CreateGroupModal } from './CreateGroupModal';
import { JoinGroupModal } from './JoinGroupModal';
import { accentOf } from '../../utils/accents';

export type NewChatTab = 'direct' | 'group' | 'join';

interface NewChatModalProps {
  contacts?: User[];
  initialTab?: NewChatTab;
  onSelectContact: (user: User) => Promise<void> | void;
  onCreateGroup?: (groupData: {
    name: string;
    avatarUrl?: string;
    memberUserIds: string[];
  }) => Promise<void>;
  onJoinGroup?: (code: string) => Promise<void>;
  onBack: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  contacts: fallbackContacts = [],
  initialTab = 'direct',
  onSelectContact,
  onCreateGroup,
  onJoinGroup,
  onBack,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id || 'user_alex';

  const [activeTab, setActiveTab] = useState<NewChatTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingChatWithId, setIsStartingChatWithId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const results = await searchRegisteredUsers(query, currentUserId);
        setUsers(results);
      } catch (err: any) {
        console.error('Error searching registered users:', err);
        setUsers(fallbackContacts.filter((c) => c.id !== currentUserId));
      } finally {
        setIsLoading(false);
      }
    },
    [currentUserId, fallbackContacts]
  );

  useEffect(() => {
    if (activeTab === 'direct') {
      performSearch('');
    }
  }, [performSearch, activeTab]);

  useEffect(() => {
    if (activeTab !== 'direct') return;
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch, activeTab]);

  const handleSelect = async (selectedUser: User) => {
    if (isStartingChatWithId) return;
    setIsStartingChatWithId(selectedUser.id);
    setErrorMessage(null);
    try {
      await onSelectContact(selectedUser);
    } catch (err: any) {
      console.error('Failed to start chat with user:', err);
      setErrorMessage(err.message || 'Could not start conversation. Please try again.');
    } finally {
      setIsStartingChatWithId(null);
    }
  };

  if (activeTab === 'group' && onCreateGroup) {
    return (
      <CreateGroupModal
        onBack={() => setActiveTab('direct')}
        onCreateGroup={onCreateGroup}
      />
    );
  }

  if (activeTab === 'join' && onJoinGroup) {
    return (
      <JoinGroupModal
        onBack={() => setActiveTab('direct')}
        onJoinGroup={onJoinGroup}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col h-full w-full bg-white relative z-30 overflow-hidden"
    >
      <header className="w-full top-0 sticky bg-white border-b border-slate-200 z-10 shadow-2xs">
        <div className="flex justify-between items-center px-4 py-3.5 max-w-[640px] mx-auto w-full">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex items-center justify-center p-2 -ml-2 rounded-full text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Start Conversation</h1>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex items-center justify-center gap-2 px-4 pb-3 max-w-[640px] mx-auto w-full">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Direct Chat</span>
          </button>

          {onCreateGroup && (
            <button
              type="button"
              onClick={() => setActiveTab('group')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'group'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          )}

          {onJoinGroup && (
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join with Code</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-[640px] w-full mx-auto pb-12">
        <div className="px-4 my-4">
          <div className="relative flex items-center w-full rounded-2xl bg-slate-50 px-3.5 py-2.5 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registered users by name or username..."
              className="w-full bg-transparent border-none focus:outline-hidden text-sm text-slate-800 placeholder-slate-400 p-0 m-0"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11.5px] text-slate-500 mt-2 px-1">
            Search registered users on Alap to start a 1-on-1 direct chat.
          </p>
        </div>

        {errorMessage && (
          <div className="mx-4 mb-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col px-2">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Searching registered users...</span>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {searchQuery.trim() ? `Search Results (${users.length})` : `All Users (${users.length})`}
              </div>

              {users.map((item) => {
                const isSelected = isStartingChatWithId === item.id;
                const accent = accentOf(item.accent, item.id);
                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.005 }}
                    onClick={() => handleSelect(item)}
                    className="flex items-center px-3.5 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-left w-full cursor-pointer border border-transparent hover:border-slate-100 group"
                  >
                    <Avatar
                      src={item.avatar}
                      name={item.name}
                      size="lg"
                      isOnline={item.isOnline}
                      className="mr-3.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {item.name}
                        </span>
                        {item.username && (
                          <span className="text-[11px] text-slate-400 font-medium truncate">
                            @{item.username}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 font-medium ${accent.text}`}>
                        {item.bio || item.statusText || 'Available'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                      disabled={isSelected}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSelected ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <UserIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-700">No users found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                {searchQuery.trim()
                  ? `No registered users matched "${searchQuery}". Try a different name or username.`
                  : 'No other registered users are available yet. Invite a friend to register and start chatting!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
