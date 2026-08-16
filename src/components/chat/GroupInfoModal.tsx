import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Shield,
  UserPlus,
  UserMinus,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Ban,
  LogOut,
  Edit2,
  Check as CheckIcon,
  Sparkles,
  Loader2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { Conversation, GroupMember, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  getOrGenerateGroupInviteCode,
  regenerateGroupInviteCode,
  revokeGroupInviteCode,
  copyTextToClipboard,
  searchRegisteredUsers,
} from '../../lib/chatService';
import { useAuth } from '../../context/AuthContext';

interface GroupInfoModalProps {
  conversation: Conversation;
  currentUserId?: string;
  isOpen?: boolean;
  onClose: () => void;
  onGroupUpdated?: (updated: Partial<Conversation>) => void;
  onConversationUpdated?: (updated?: Partial<Conversation>) => void;
  onLeaveGroup?: () => void;
  onGroupLeft?: (conversationId: string) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  conversation,
  currentUserId: propUserId,
  isOpen = true,
  onClose,
  onGroupUpdated,
  onConversationUpdated,
  onLeaveGroup,
  onGroupLeft,
}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id || '';

  const isAdmin =
    conversation.currentUserRole === 'admin' ||
    conversation.createdBy === currentUserId ||
    (conversation.groupMembers &&
      conversation.groupMembers.some((m) => m.userId === currentUserId && m.role === 'admin'));

  // Group Info Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(conversation.name || '');
  const [avatarUrl, setAvatarUrl] = useState(conversation.avatar || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Invite Code State
  const [inviteCode, setInviteCode] = useState<string | null>(conversation.inviteCode || null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [isRevokingCode, setIsRevokingCode] = useState(false);

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Confirmation Modals State
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load active invite code
  const loadInviteCode = useCallback(async () => {
    if (!conversation.id) return;
    setIsLoadingCode(true);
    try {
      const code = await getOrGenerateGroupInviteCode(conversation.id, currentUserId);
      setInviteCode(code);
    } catch (err) {
      console.warn('Error loading invite code:', err);
    } finally {
      setIsLoadingCode(false);
    }
  }, [conversation.id, currentUserId]);

  useEffect(() => {
    if (isOpen) {
      setNameInput(conversation.name || '');
      setAvatarUrl(conversation.avatar || '');
      loadInviteCode();
    }
  }, [isOpen, conversation, loadInviteCode]);

  // Load registered users when Add Member dialog opens
  useEffect(() => {
    if (!isAddMemberOpen) return;
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const users = await searchRegisteredUsers(searchUserQuery, currentUserId);
        // Filter out users who are already in the group
        const existingIds = new Set(
          conversation.participantIds ||
            (conversation.participants ? conversation.participants.map((p) => p.id) : [])
        );
        setAvailableUsers(users.filter((u) => !existingIds.has(u.id)));
      } catch (err) {
        console.error('Error fetching users to add:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [isAddMemberOpen, searchUserQuery, currentUserId, conversation.participantIds, conversation.participants]);

  if (!isOpen) return null;

  const notifyUpdated = (updatedData: Partial<Conversation> = {}) => {
    if (onGroupUpdated) {
      onGroupUpdated(updatedData);
    }
    if (onConversationUpdated) {
      onConversationUpdated(updatedData);
    }
  };

  // Handlers
  const handleSaveGroupInfo = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMessage('Group name cannot be empty');
      return;
    }

    setIsSavingInfo(true);
    setErrorMessage(null);
    try {
      await updateGroupInfo(conversation.id, currentUserId, {
        name: trimmed,
        avatarUrl,
      });
      setIsEditingName(false);
      setSuccessMessage('Group information updated.');
      setTimeout(() => setSuccessMessage(null), 3000);
      notifyUpdated({ name: trimmed, avatar: avatarUrl });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update group information.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleRandomizeAvatar = () => {
    const seed = `${nameInput.trim() || 'group'}_${Math.random().toString(36).substring(2, 8)}`;
    const newAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
    setAvatarUrl(newAvatar);
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    const success = await copyTextToClipboard(inviteCode);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegeneratingCode(true);
    setShowRegenConfirm(false);
    setErrorMessage(null);
    try {
      const newCode = await regenerateGroupInviteCode(conversation.id, currentUserId);
      setInviteCode(newCode);
      setSuccessMessage('New invite access code generated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to regenerate code');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleRevokeCode = async () => {
    setIsRevokingCode(true);
    setErrorMessage(null);
    try {
      await revokeGroupInviteCode(conversation.id, currentUserId);
      setInviteCode(null);
      setSuccessMessage('Access code revoked.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to revoke code');
    } finally {
      setIsRevokingCode(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedNewUserIds.length === 0) return;
    setIsAddingMembers(true);
    setErrorMessage(null);
    try {
      await addGroupMembers(conversation.id, currentUserId, selectedNewUserIds);
      
      // Update local member lists immediately
      const addedUsers = availableUsers.filter((u) => selectedNewUserIds.includes(u.id));
      const newMembers: GroupMember[] = addedUsers.map((u) => ({
        userId: u.id,
        role: 'member',
        joinedAt: new Date().toISOString(),
        user: u,
      }));

      const updatedParticipantIds = [
        ...(conversation.participantIds || []),
        ...selectedNewUserIds,
      ];
      const updatedParticipants = [
        ...(conversation.participants || []),
        ...addedUsers,
      ];
      const updatedGroupMembers = [
        ...(conversation.groupMembers || []),
        ...newMembers,
      ];

      setSelectedNewUserIds([]);
      setIsAddMemberOpen(false);
      setSuccessMessage('Members added successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      notifyUpdated({
        participantIds: updatedParticipantIds,
        participants: updatedParticipants,
        groupMembers: updatedGroupMembers,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add members.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    setErrorMessage(null);
    try {
      await removeGroupMember(conversation.id, currentUserId, memberToRemove.userId);
      const removedId = memberToRemove.userId;
      setMemberToRemove(null);
      setSuccessMessage(`${memberToRemove.user.name} removed from group.`);
      setTimeout(() => setSuccessMessage(null), 3000);

      const updatedParticipantIds = (conversation.participantIds || []).filter((id) => id !== removedId);
      const updatedParticipants = (conversation.participants || []).filter((p) => p.id !== removedId);
      const updatedGroupMembers = (conversation.groupMembers || []).filter((m) => m.userId !== removedId);

      notifyUpdated({
        participantIds: updatedParticipantIds,
        participants: updatedParticipants,
        groupMembers: updatedGroupMembers,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove member.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    setShowLeaveConfirm(false);
    setErrorMessage(null);
    try {
      await leaveGroup(conversation.id, currentUserId);
      onClose();
      if (onLeaveGroup) {
        onLeaveGroup();
      }
      if (onGroupLeft) {
        onGroupLeft(conversation.id);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to leave group.');
      setIsLeaving(false);
    }
  };

  const members: GroupMember[] =
    conversation.groupMembers && conversation.groupMembers.length > 0
      ? conversation.groupMembers
      : conversation.participants.map((p) => ({
          userId: p.id,
          role: p.id === conversation.createdBy ? 'admin' : 'member',
          joinedAt: '',
          user: p,
        }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-base">Group Details</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Group Header Info / Edit Card */}
          <div className="flex flex-col items-center text-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div className="relative mb-3">
              <Avatar
                src={avatarUrl}
                name={conversation.name}
                size="2xl"
                className="border-3 border-white shadow-xs"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  title="Randomize Group Avatar"
                  className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingName && isAdmin ? (
              <div className="flex items-center gap-2 w-full max-w-xs mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveGroupInfo}
                  disabled={isSavingInfo}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                  title="Save Name"
                >
                  {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(conversation.name);
                    setIsEditingName(false);
                  }}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{conversation.name}</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer"
                    title="Edit group name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{members.length} members</span>
              <span>•</span>
              <span className="capitalize">Role: {conversation.currentUserRole || 'member'}</span>
            </div>

            {isAdmin && avatarUrl !== conversation.avatar && (
              <button
                type="button"
                onClick={handleSaveGroupInfo}
                disabled={isSavingInfo}
                className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckIcon className="w-3.5 h-3.5" />}
                <span>Save New Avatar</span>
              </button>
            )}
          </div>

          {/* Group Access Code Section */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Group Access Code
                </span>
              </div>
              {isAdmin && inviteCode && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowRegenConfirm(true)}
                    disabled={isRegeneratingCode}
                    className="p-1 text-indigo-600 hover:bg-indigo-100/60 rounded-md transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
                    title="Regenerate access code"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCode ? 'animate-spin' : ''}`} />
                    <span className="text-[11px]">Regen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeCode}
                    disabled={isRevokingCode}
                    className="p-1 text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
                    title="Revoke access code"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Revoke</span>
                  </button>
                </div>
              )}
            </div>

            {isLoadingCode ? (
              <div className="py-2 flex items-center justify-center text-indigo-600 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading access code...</span>
              </div>
            ) : inviteCode ? (
              <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                <span className="font-mono font-bold tracking-widest text-slate-800 text-sm">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-slate-500 mb-2">No active invite code for this group.</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={isRegeneratingCode}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Generate Invite Code
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-indigo-900/70">
              Share this 8-character code with others to allow them to quickly join this group conversation.
            </p>
          </div>

          {/* Members List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Group Members ({members.length})
                </h4>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isMemberAdmin = member.role === 'admin';

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <Avatar
                        src={member.user?.avatar}
                        name={member.user?.name || 'User'}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {isSelf ? `${member.user?.name || 'You'} (You)` : member.user?.name}
                          </span>
                          {isMemberAdmin && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {member.user?.statusText || 'Available'}
                        </p>
                      </div>
                    </div>

                    {/* Admin Action: Remove Member */}
                    {isAdmin && !isSelf && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full py-2.5 px-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Members Sub-Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Add Members to Group</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setSelectedNewUserIds([]);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center w-full rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search registered users..."
                className="w-full bg-transparent border-none focus:outline-none text-xs text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* User List */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Searching...</span>
                </div>
              ) : availableUsers.length > 0 ? (
                availableUsers.map((item) => {
                  const isSelected = selectedNewUserIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedNewUserIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        );
                      }}
                      className={`flex items-center px-3 py-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Avatar src={item.avatar} name={item.name} size="sm" className="mr-2" />
                      <span className="text-xs font-semibold text-slate-800 flex-1 truncate">
                        {item.name}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-4 text-center text-xs text-slate-400">
                  No additional users found to add.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setSelectedNewUserIds([]);
                }}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMembersSubmit}
                disabled={isAddingMembers || selectedNewUserIds.length === 0}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1"
              >
                {isAddingMembers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Add ({selectedNewUserIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Remove Member</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">{memberToRemove.user.name}</strong> from this group?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1"
              >
                {isRemovingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Leave Group</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to leave <strong className="text-slate-800">{conversation.name}</strong>? You will need an access code or an invitation to rejoin.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isLeaving}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={isLeaving}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1"
              >
                {isLeaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Access Code Confirmation */}
      {showRegenConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Regenerate Code</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will immediately invalidate the previous access code. Anyone trying to join using the old code will be rejected.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
