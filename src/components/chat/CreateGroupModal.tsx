import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  Users,
  Check,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { searchRegisteredUsers } from '../../lib/chatService';
import { useAuth } from '../../context/AuthContext';

interface CreateGroupModalProps {
  onBack: () => void;
  onCreateGroup: (groupData: {
    name: string;
    avatarUrl?: string;
    memberUserIds: string[];
  }) => Promise<void>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  onBack,
  onCreateGroup,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const [groupName, setGroupName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(() => `group_${Date.now().toString(36)}`);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentAvatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
    avatarSeed
  )}`;

  // Search registered users
  const loadUsers = useCallback(
    async (query: string) => {
      setIsLoadingUsers(true);
      setErrorMessage(null);
      try {
        const results = await searchRegisteredUsers(query, currentUserId);
        setAvailableUsers(results);
      } catch (err: any) {
        console.error('Error searching registered users for group:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    loadUsers('');
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, loadUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    setAvatarSeed(groupName.trim() ? `${groupName.trim()}_${randomSeed}` : randomSeed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a group name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onCreateGroup({
        name: trimmedName,
        avatarUrl: currentAvatarUrl,
        memberUserIds: selectedUserIds,
      });
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setErrorMessage(err?.message || 'Failed to create group. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative z-30 overflow-hidden">
      {/* Top Header */}
      <header className="w-full top-0 sticky bg-white border-b border-slate-200 z-10 shadow-2xs">
        <div className="flex justify-between items-center px-4 py-3.5 max-w-[640px] mx-auto w-full">
          <button
            onClick={onBack}
            aria-label="Back"
            disabled={isSubmitting}
            className="flex items-center justify-center p-2 -ml-2 rounded-full text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Create New Group</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Main Form Content */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto max-w-[640px] w-full mx-auto p-4 pb-20 space-y-5"
      >
        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
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

        {/* Group Avatar & Name Section */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="relative shrink-0">
            <Avatar
              src={currentAvatarUrl}
              name={groupName || 'Group'}
              size="xl"
              className="border-2 border-white shadow-xs"
            />
            <button
              type="button"
              onClick={handleRandomizeAvatar}
              title="Generate new avatar"
              className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (avatarSeed.startsWith('group_')) {
                  setAvatarSeed(e.target.value.trim() || 'group');
                }
              }}
              placeholder="e.g. Project Alpha, Family, Tech Talk..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Member Selection Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Add Members ({selectedUserIds.length} selected)
            </label>
            {selectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search Members Input */}
          <div className="relative flex items-center w-full rounded-xl bg-slate-100 px-3.5 py-2 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or username..."
              className="w-full bg-transparent border-none focus:outline-none text-xs text-slate-800 placeholder-slate-400 p-0 m-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* User Selection List */}
          <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-[300px] overflow-y-auto bg-white">
            {isLoadingUsers ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading users...</span>
              </div>
            ) : availableUsers.length > 0 ? (
              availableUsers.map((item) => {
                const isSelected = selectedUserIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleUserSelection(item.id)}
                    className={`flex items-center px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar
                      src={item.avatar}
                      name={item.name}
                      size="md"
                      className="mr-3 shrink-0"
                    />
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {item.name}
                        </span>
                        {item.username && (
                          <span className="text-[11px] text-slate-400 truncate">
                            @{item.username}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.bio || item.statusText || 'Available'}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center">
                <UserIcon className="w-6 h-6 text-slate-400 mb-1" />
                <p>No registered users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !groupName.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating group...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Create Group</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
