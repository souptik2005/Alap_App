import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { Conversation, Message, User, Profile, MessageType, RepliedMessagePreview } from '../types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_USERS } from './mockData';

// Helper to map DB profile to User UI model
export function profileToUser(profile: Partial<Profile>): User {
  const name =
    profile.display_name ||
    profile.username ||
    (profile.id ? `user_${profile.id.slice(0, 5)}` : 'Unknown');

  const avatar =
    profile.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id || 'default'}`;

  return {
    id: profile.id || '',
    name,
    username: profile.username || undefined,
    email: '',
    avatar,
    statusText: profile.bio || 'Available',
    bio: profile.bio || 'Available',
    isOnline: false,
  };
}

// Search registered users from Supabase profiles table
export async function searchRegisteredUsers(
  query: string,
  currentUserId: string
): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    const trimmed = query.trim().toLowerCase();
    return MOCK_USERS.filter((u) => {
      if (u.id === currentUserId) return false;
      if (!trimmed) return true;
      return (
        u.name.toLowerCase().includes(trimmed) ||
        (u.username && u.username.toLowerCase().includes(trimmed)) ||
        u.email.toLowerCase().includes(trimmed)
      );
    });
  }

  try {
    let builder = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
      .neq('id', currentUserId);

    const trimmed = query.trim();
    if (trimmed) {
      builder = builder.or(
        `display_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`
      );
    }

    const { data, error } = await builder
      .order('display_name', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('Error searching registered profiles:', error.message);
      return [];
    }

    return (data || []).map((p) => profileToUser(p));
  } catch (err) {
    console.error('Failed to search profiles:', err);
    return [];
  }
}

// Fetch user conversations and participant information
export async function fetchUserConversations(currentUserId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_CONVERSATIONS;
  }

  try {
    // 1. Get all conversations the current user is a member of
    const { data: memberRows, error: memberErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (memberErr) {
      console.error('Error fetching member records:', memberErr);
      return [];
    }

    if (!memberRows || memberRows.length === 0) {
      return [];
    }

    const conversationIds = memberRows.map((r) => r.conversation_id);

    // 2. Fetch the conversation metadata
    const { data: conversationsData, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (convErr || !conversationsData) {
      console.error('Error fetching conversations:', convErr);
      return [];
    }

    // 3. Fetch all members of these conversations
    const { data: allMembers, error: allMembersErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, role')
      .in('id', conversationIds.length > 0 ? conversationIds : ['none']);

    // Fix query for conversation_members: filter by conversation_id in list
    const { data: convMembersData } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, role')
      .in('conversation_id', conversationIds);

    const membersList = convMembersData || allMembers || [];

    // Collect all unique user IDs to fetch their profiles
    const uniqueUserIds = Array.from(new Set(membersList.map((m: { user_id: string }) => m.user_id)));

    const profilesMap: Record<string, Profile> = {};
    if (uniqueUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueUserIds);

      (profilesData || []).forEach((p: Profile) => {
        profilesMap[p.id] = p;
      });
    }

    // 4. Fetch the latest messages for preview (we also use this to compute unread counts)
    const { data: messagesData } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, message_type, created_at')
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // 4b. Fetch which messages the current user has already read
    const allMessageIds = (messagesData || []).map((m: any) => m.id);
    const readMessageIdSet = new Set<string>();
    if (allMessageIds.length > 0) {
      try {
        const { data: readsData } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', currentUserId)
          .in('message_id', allMessageIds);
        (readsData || []).forEach((r: any) => readMessageIdSet.add(r.message_id));
      } catch (readErr) {
        console.warn('Unable to fetch message_reads for unread counts:', readErr);
      }
    }

    // Build per-conversation unread count: messages from others that haven't been read
    const unreadCountByConv: Record<string, number> = {};
    (messagesData || []).forEach((msg: any) => {
      if (msg.sender_id !== currentUserId && !readMessageIdSet.has(msg.id)) {
        unreadCountByConv[msg.conversation_id] = (unreadCountByConv[msg.conversation_id] || 0) + 1;
      }
    });

    // Group latest message by conversation_id
    const latestMsgByConv: Record<string, any> = {};
    (messagesData || []).forEach((msg: any) => {
      if (!latestMsgByConv[msg.conversation_id]) {
        latestMsgByConv[msg.conversation_id] = msg;
      }
    });
    const groupConvIds = conversationsData.filter((c) => c.type === 'group').map((c) => c.id);
    const inviteCodesByConv: Record<string, string> = {};
    if (groupConvIds.length > 0) {
      try {
        const { data: invitesData } = await supabase
          .from('group_invites')
          .select('conversation_id, code')
          .in('conversation_id', groupConvIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        (invitesData || []).forEach((inv: { conversation_id: string; code: string }) => {
          if (!inviteCodesByConv[inv.conversation_id]) {
            inviteCodesByConv[inv.conversation_id] = inv.code;
          }
        });
      } catch (inviteFetchErr) {
        console.warn('Error pre-fetching group invites:', inviteFetchErr);
      }
    }

    // Group members by conversation_id
    const membersByConv: Record<string, { userId: string; role: string; profile?: Profile }[]> = {};
    membersList.forEach((item: { conversation_id: string; user_id: string; role: string }) => {
      if (!membersByConv[item.conversation_id]) {
        membersByConv[item.conversation_id] = [];
      }
      membersByConv[item.conversation_id].push({
        userId: item.user_id,
        role: item.role,
        profile: profilesMap[item.user_id],
      });
    });


    // Construct UI Conversation objects

    const result: Conversation[] = conversationsData.map((c) => {
      const convMembers = membersByConv[c.id] || [];
      const participants: User[] = convMembers.map((m) =>
        m.profile
          ? profileToUser(m.profile)
          : {
              id: m.userId,
              name: m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 4)}`,
              email: '',
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`,
              statusText: 'Available',
              bio: 'Available',
              isOnline: false,
            }
      );

      const otherParticipant =
        participants.find((p) => p.id !== currentUserId) ||
        participants[0] || {
          id: 'unknown',
          name: c.name || 'Direct Conversation',
          email: '',
          avatar: c.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.id}`,
          statusText: 'Available',
          bio: 'Available',
          isOnline: false,
        };

      const displayName =
        c.type === 'direct'
          ? otherParticipant.name
          : c.name || 'Group Conversation';

      const displayAvatar =
        c.type === 'direct'
          ? otherParticipant.avatar
          : c.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.id}`;

      const latestMsg = latestMsgByConv[c.id];
      let lastMessageFormatted: Conversation['lastMessage'] = undefined;

      if (latestMsg) {
        const msgTime = new Date(latestMsg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const senderProfile = profilesMap[latestMsg.sender_id];
        const senderName =
          latestMsg.sender_id === currentUserId
            ? 'You'
            : senderProfile?.display_name || senderProfile?.username || undefined;

        lastMessageFormatted = {
          text: latestMsg.content,
          timestamp: msgTime,
          senderId: latestMsg.sender_id,
          senderName,
        };
      }

      const formattedUpdated = c.updated_at
        ? new Date(c.updated_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })
        : 'Just now';

      const currentUserMember = convMembers.find((m) => m.userId === currentUserId);
      const currentUserRole = (currentUserMember?.role || 'member') as 'admin' | 'member';

      const groupMembersList = convMembers.map((m) => ({
        userId: m.userId,
        role: (m.role || 'member') as 'admin' | 'member',
        joinedAt: '',
        user: m.profile
          ? profileToUser(m.profile)
          : {
              id: m.userId,
              name: m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 4)}`,
              email: '',
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`,
              statusText: 'Available',
              bio: 'Available',
              isOnline: false,
            },
      }));

      return {
        id: c.id,
        name: displayName,
        type: c.type as 'direct' | 'group',
        avatar: displayAvatar,
        unreadCount: unreadCountByConv[c.id] || 0,
        lastMessage: lastMessageFormatted,
        updatedAt: formattedUpdated,
        isOnline: otherParticipant.isOnline,
        participantIds: convMembers.map((m) => m.userId),
        participants,
        otherUser: c.type === 'direct' ? otherParticipant : undefined,
        currentUserRole,
        createdBy: c.created_by || undefined,
        groupMembers: groupMembersList,
        inviteCode: c.type === 'group' ? inviteCodesByConv[c.id] || null : undefined,
      };
    });

    return result;
  } catch (err) {
    console.error('Failed to fetch user conversations:', err);
    return [];
  }
}

// Fetch single conversation by ID
export async function fetchConversationById(
  conversationId: string,
  currentUserId: string
): Promise<Conversation | null> {
  const convs = await fetchUserConversations(currentUserId);
  return convs.find((c) => c.id === conversationId) || null;
}

// Get or create direct conversation with duplicate prevention
export async function getOrCreateDirectConversation(
  currentUserId: string,
  partner: User
): Promise<{ conversation: Conversation; isNew: boolean }> {
  if (!isSupabaseConfigured()) {
    const existing = MOCK_CONVERSATIONS.find(
      (c) => c.participantIds.includes(partner.id) && c.type === 'direct'
    );
    if (existing) {
      return { conversation: existing, isNew: false };
    }
    const newConv: Conversation = {
      id: `conv_${partner.id}_${Date.now()}`,
      name: partner.name,
      type: 'direct',
      avatar: partner.avatar,
      unreadCount: 0,
      updatedAt: 'Just now',
      isOnline: partner.isOnline,
      participantIds: [currentUserId, partner.id],
      participants: [
        {
          id: currentUserId,
          name: 'You',
          email: '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
        },
        partner,
      ],
      otherUser: partner,
    };
    return { conversation: newConv, isNew: true };
  }

  try {
    // 1. Check for an existing direct conversation between current user and partner
    const { data: myMemberships, error: memberErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (!memberErr && myMemberships && myMemberships.length > 0) {
      const myConvIds = myMemberships.map((m) => m.conversation_id);

      const { data: partnerMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', partner.id)
        .in('conversation_id', myConvIds);

      if (partnerMemberships && partnerMemberships.length > 0) {
        const sharedConvIds = partnerMemberships.map((m) => m.conversation_id);

        const { data: directConvs } = await supabase
          .from('conversations')
          .select('*')
          .in('id', sharedConvIds)
          .eq('type', 'direct')
          .limit(1);

        if (directConvs && directConvs.length > 0) {
          const existingConv = await fetchConversationById(directConvs[0].id, currentUserId);
          if (existingConv) {
            return { conversation: existingConv, isNew: false };
          }
        }
      }
    }

    // 2. No existing direct conversation found - create a new one!
    const newConvId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: createConvErr } = await supabase
      .from('conversations')
      .insert({
        id: newConvId,
        type: 'direct',
        name: null,
        avatar_url: null,
        created_at: now,
        updated_at: now,
      });

    if (createConvErr) {
      console.error('Failed to create conversation record:', createConvErr);
      throw new Error(`Failed to create conversation: ${createConvErr.message}`);
    }

    // 3. Add current user as member first
    const { error: addSelfErr } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: newConvId,
        user_id: currentUserId,
        role: 'member',
        joined_at: now,
      });

    if (addSelfErr) {
      console.error('Error adding current user to conversation:', addSelfErr);
      throw new Error(`Failed to join conversation: ${addSelfErr.message}`);
    }

    // 4. Add partner as member
    const { error: addPartnerErr } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: newConvId,
        user_id: partner.id,
        role: 'member',
        joined_at: now,
      });

    if (addPartnerErr) {
      console.warn('Warning adding partner to conversation:', addPartnerErr);
    }

    const createdConversation: Conversation = {
      id: newConvId,
      name: partner.name,
      type: 'direct',
      avatar: partner.avatar,
      unreadCount: 0,
      updatedAt: 'Just now',
      isOnline: partner.isOnline,
      participantIds: [currentUserId, partner.id],
      participants: [
        {
          id: currentUserId,
          name: 'You',
          email: '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
        },
        partner,
      ],
      otherUser: partner,
    };

    return { conversation: createdConversation, isNew: true };
  } catch (err: unknown) {
    console.error('Failed to get or create direct conversation:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// Phase 4: Message History & Sending Functions
// -------------------------------------------------------------

// Helper to format ISO timestamp to human-friendly time
export function formatMessageTimestamp(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return 'Just now';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

// -------------------------------------------------------------
// Phase 7: Group Messaging & Invite Code Operations
// -------------------------------------------------------------

// Local storage key for persistent group invite caching across sessions
const LOCAL_INVITES_KEY = 'alap_group_invites_cache';

interface CachedInvite {
  conversationId: string;
  name: string;
  avatarUrl?: string | null;
  createdBy?: string;
  memberCount?: number;
}

function getLocalInvitesMap(): Record<string, CachedInvite> {
  try {
    const raw = localStorage.getItem(LOCAL_INVITES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalInvite(code: string, data: CachedInvite) {
  try {
    const map = getLocalInvitesMap();
    map[code.trim().toUpperCase()] = data;
    localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to cache invite locally:', err);
  }
}

// Cryptographically secure 8-character uppercase alphanumeric code generator
export function generateSecureAccessCode(): string {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

// Create a new group conversation
export async function createGroupConversation({
  name,
  avatarUrl,
  memberUserIds,
  currentUserId,
}: {
  name: string;
  avatarUrl?: string;
  memberUserIds: string[];
  currentUserId: string;
}): Promise<Conversation> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Group name cannot be empty');
  }

  const newConvId = crypto.randomUUID();
  const now = new Date().toISOString();
  const finalAvatar =
    avatarUrl?.trim() ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(trimmedName)}`;

  // Deduplicate member IDs and ensure current user is included
  const allMemberIds = Array.from(new Set([currentUserId, ...memberUserIds]));

  if (!isSupabaseConfigured()) {
    const participants: User[] = allMemberIds.map((id) => {
      if (id === currentUserId) {
        return {
          id: currentUserId,
          name: 'You',
          email: '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
        };
      }
      const found = MOCK_USERS.find((u) => u.id === id);
      return (
        found || {
          id,
          name: `User ${id.slice(0, 4)}`,
          email: '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        }
      );
    });

    const mockInviteCode = generateSecureAccessCode();
    saveLocalInvite(mockInviteCode, {
      conversationId: newConvId,
      name: trimmedName,
      avatarUrl: finalAvatar,
      createdBy: currentUserId,
      memberCount: participants.length,
    });
    const groupConv: Conversation = {
      id: newConvId,
      name: trimmedName,
      type: 'group',
      avatar: finalAvatar,
      unreadCount: 0,
      updatedAt: 'Just now',
      participantIds: allMemberIds,
      participants,
      currentUserRole: 'admin',
      createdBy: currentUserId,
      inviteCode: mockInviteCode,
      groupMembers: participants.map((p) => ({
        userId: p.id,
        role: p.id === currentUserId ? 'admin' : 'member',
        joinedAt: now,
        user: p,
      })),
    };
    return groupConv;
  }

  try {
    // 1. Insert into `conversations` table
    const { error: convErr } = await supabase.from('conversations').insert({
      id: newConvId,
      type: 'group',
      name: trimmedName,
      avatar_url: finalAvatar,
      created_at: now,
      updated_at: now,
    });

    if (convErr) {
      console.error('Error creating group conversation:', convErr);
      throw new Error(`Failed to create group: ${convErr.message}`);
    }

    // 2. Insert creator first as 'admin'
    const { error: creatorErr } = await supabase.from('conversation_members').insert([
      {
        conversation_id: newConvId,
        user_id: currentUserId,
        role: 'admin',
        joined_at: now,
      },
    ]);

    if (creatorErr) {
      console.warn('Notice adding creator as admin to conversation_members:', creatorErr);
    }

    // Add other initial selected members (if any)
    const otherMemberIds = allMemberIds.filter((id) => id !== currentUserId);
    if (otherMemberIds.length > 0) {
      const otherMemberRows = otherMemberIds.map((userId) => ({
        conversation_id: newConvId,
        user_id: userId,
        role: 'member',
        joined_at: now,
      }));

      const { error: otherMembersErr } = await supabase
        .from('conversation_members')
        .insert(otherMemberRows);

      if (otherMembersErr) {
        console.warn('Notice adding invited members (they can also join via access code or invite):', otherMembersErr);
      }
    }

    // 3. Generate initial active invite access code for this group
    const initialCode = generateSecureAccessCode();
    saveLocalInvite(initialCode, {
      conversationId: newConvId,
      name: trimmedName,
      avatarUrl: finalAvatar,
      createdBy: currentUserId,
      memberCount: allMemberIds.length,
    });
    try {
      await supabase.from('group_invites').insert({
        id: crypto.randomUUID(),
        conversation_id: newConvId,
        code: initialCode,
        created_by: currentUserId,
        created_at: now,
        is_active: true,
      });
    } catch (inviteErr) {
      console.warn('Unable to persist group_invite record:', inviteErr);
    }

    // 4. Fetch full conversation structure
    const fullConv = await fetchConversationById(newConvId, currentUserId);
    if (fullConv) {
      return {
        ...fullConv,
        inviteCode: initialCode,
        currentUserRole: 'admin',
      };
    }

    return {
      id: newConvId,
      name: trimmedName,
      type: 'group',
      avatar: finalAvatar,
      unreadCount: 0,
      updatedAt: 'Just now',
      participantIds: allMemberIds,
      participants: allMemberIds.map((id) => ({
        id,
        name: id === currentUserId ? 'You' : `User ${id.slice(0, 4)}`,
        email: '',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      })),
      currentUserRole: 'admin',
      createdBy: currentUserId,
      inviteCode: initialCode,
    };
  } catch (err: any) {
    console.error('createGroupConversation failed:', err);
    throw err;
  }
}

// Update group information (name, avatar) by Admin
export async function updateGroupInfo(
  conversationId: string,
  currentUserId: string,
  updates: { name?: string; avatarUrl?: string }
): Promise<void> {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined && updates.name.trim()) {
    payload.name = updates.name.trim();
  }
  if (updates.avatarUrl !== undefined && updates.avatarUrl.trim()) {
    payload.avatar_url = updates.avatarUrl.trim();
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating group info:', error);
    throw new Error(error.message || 'Failed to update group information.');
  }
}

// Add new members to group
export async function addGroupMembers(
  conversationId: string,
  currentUserId: string,
  newUserIds: string[]
): Promise<void> {
  if (newUserIds.length === 0) return;

  const now = new Date().toISOString();
  const rows = newUserIds.map((uid) => ({
    conversation_id: conversationId,
    user_id: uid,
    role: 'member',
    joined_at: now,
  }));

  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase
    .from('conversation_members')
    .upsert(rows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });

  if (error) {
    console.error('Error adding group members:', error);
    throw new Error(error.message || 'Failed to add members to group.');
  }
}

// Remove member from group by Admin
export async function removeGroupMember(
  conversationId: string,
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId);

  if (error) {
    console.error('Error removing group member:', error);
    throw new Error(error.message || 'Failed to remove member from group.');
  }
}

// Leave group conversation
export async function leaveGroup(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  // Check if current user is the sole admin. If so, promote another member to admin
  try {
    const { data: members } = await supabase
      .from('conversation_members')
      .select('user_id, role')
      .eq('conversation_id', conversationId);

    if (members && members.length > 1) {
      const isSoleAdmin =
        members.some((m) => m.user_id === currentUserId && m.role === 'admin') &&
        members.filter((m) => m.role === 'admin').length === 1;

      if (isSoleAdmin) {
        const nextMember = members.find((m) => m.user_id !== currentUserId);
        if (nextMember) {
          await supabase
            .from('conversation_members')
            .update({ role: 'admin' })
            .eq('conversation_id', conversationId)
            .eq('user_id', nextMember.user_id);
        }
      }
    }
  } catch (checkErr) {
    console.warn('Error verifying admin succession on leave:', checkErr);
  }

  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', currentUserId);

  if (error) {
    console.error('Error leaving group:', error);
    throw new Error(error.message || 'Failed to leave group.');
  }
}

// Get or generate active invite access code for group
export async function getOrGenerateGroupInviteCode(
  conversationId: string,
  currentUserId: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    return generateSecureAccessCode();
  }

  try {
    const { data, error } = await supabase
      .from('group_invites')
      .select('code, is_active')
      .eq('conversation_id', conversationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.code) {
      return data.code;
    }

    // Generate new active code
    const newCode = generateSecureAccessCode();
    await supabase.from('group_invites').insert({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      code: newCode,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      is_active: true,
    });

    return newCode;
  } catch (err) {
    console.warn('Error in getOrGenerateGroupInviteCode:', err);
    return generateSecureAccessCode();
  }
}

// Regenerate group invite access code (invalidates previous codes)
export async function regenerateGroupInviteCode(
  conversationId: string,
  currentUserId: string
): Promise<string> {
  const newCode = generateSecureAccessCode();
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return newCode;
  }

  try {
    // 1. Revoke existing active codes
    await supabase
      .from('group_invites')
      .update({ is_active: false, revoked_at: now })
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    // 2. Insert fresh active code
    const { error } = await supabase.from('group_invites').insert({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      code: newCode,
      created_by: currentUserId,
      created_at: now,
      is_active: true,
    });

    if (error) {
      console.error('Error inserting new invite code:', error);
      throw new Error(error.message || 'Failed to regenerate invite code');
    }

    return newCode;
  } catch (err: any) {
    console.error('Failed to regenerate code:', err);
    throw err;
  }
}

// Revoke all active invite codes for group
export async function revokeGroupInviteCode(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('group_invites')
    .update({ is_active: false, revoked_at: now })
    .eq('conversation_id', conversationId)
    .eq('is_active', true);

  if (error) {
    console.error('Error revoking group invite codes:', error);
    throw new Error(error.message || 'Failed to revoke invite codes.');
  }
}

// Preview group details by code before joining
export async function previewGroupByCode(
  rawCode: string,
  currentUserId: string
): Promise<{
  conversationId: string;
  name: string;
  avatarUrl: string | null;
  memberCount: number;
  isMember: boolean;
}> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Please enter a valid access code');
  }

  const localCache = getLocalInvitesMap()[cleanCode];

  if (!isSupabaseConfigured()) {
    if (localCache) {
      return {
        conversationId: localCache.conversationId,
        name: localCache.name,
        avatarUrl: localCache.avatarUrl || null,
        memberCount: localCache.memberCount || 1,
        isMember: false,
      };
    }
    return {
      conversationId: 'mock_preview_conv',
      name: 'Adda Team Chat',
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Adda',
      memberCount: 5,
      isMember: false,
    };
  }

  // 1. Look up invite code from Supabase
  let convId: string | null = null;
  try {
    const { data: invite, error: inviteErr } = await supabase
      .from('group_invites')
      .select('conversation_id, is_active, revoked_at')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (!inviteErr && invite && invite.conversation_id) {
      convId = invite.conversation_id;
    }
  } catch (err) {
    console.warn('Error querying group_invites:', err);
  }

  // Fallback to local cache if DB lookup didn't return a record
  if (!convId && localCache) {
    convId = localCache.conversationId;
  }

  if (!convId) {
    throw new Error('Invalid or expired group access code. Please verify the code with a group admin.');
  }

  // 2. Fetch member count & verify if current user is already a member
  let isMember = false;
  let memberCount = localCache?.memberCount || 1;

  try {
    const { data: membersData } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', convId);

    if (membersData && membersData.length > 0) {
      memberCount = membersData.length;
      isMember = membersData.some((m) => m.user_id === currentUserId);
    }
  } catch {
    // Non-members may encounter RLS policy restrictions before joining; gracefully fallback
  }

  // 3. Fetch conversation metadata (if accessible or fallback to cache/defaults)
  let groupName = localCache?.name || 'Group Conversation';
  let avatarUrl: string | null = localCache?.avatarUrl || null;

  try {
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, name, avatar_url, type')
      .eq('id', convId)
      .maybeSingle();

    if (convData) {
      if (convData.name) groupName = convData.name;
      if (convData.avatar_url) avatarUrl = convData.avatar_url;
    }
  } catch {
    // Non-members cannot read private conversations under RLS prior to joining
  }

  if (!avatarUrl) {
    avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName || convId)}`;
  }

  return {
    conversationId: convId,
    name: groupName,
    avatarUrl,
    memberCount,
    isMember,
  };
}

// Join group conversation with access code
export async function joinGroupByCode(
  rawCode: string,
  currentUserId: string
): Promise<Conversation> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Please enter an 8-character access code.');
  }

  const localCache = getLocalInvitesMap()[cleanCode];

  if (!isSupabaseConfigured()) {
    const mockConvId = localCache?.conversationId || `conv_group_${Date.now()}`;
    const mockConvName = localCache?.name || 'Adda Team Chat';
    const mockConv: Conversation = {
      id: mockConvId,
      name: mockConvName,
      type: 'group',
      avatar:
        localCache?.avatarUrl ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(mockConvName)}`,
      unreadCount: 0,
      updatedAt: 'Just now',
      participantIds: [currentUserId],
      participants: [
        {
          id: currentUserId,
          name: 'You',
          email: '',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
        },
      ],
      currentUserRole: 'member',
      inviteCode: cleanCode,
    };
    return mockConv;
  }

  // 1. Check if Postgres RPC function `join_group_with_code` exists
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('join_group_with_code', {
      p_code: cleanCode,
    });

    if (!rpcErr && rpcData && rpcData.conversation_id) {
      const conv = await fetchConversationById(rpcData.conversation_id, currentUserId);
      if (conv) return conv;
    }
  } catch {
    // Fallback to direct client query join
  }

  // 2. Look up invite record from DB or local cache
  let convId: string | null = null;
  try {
    const { data: invite, error: inviteErr } = await supabase
      .from('group_invites')
      .select('conversation_id, is_active')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (!inviteErr && invite && invite.conversation_id) {
      convId = invite.conversation_id;
    }
  } catch (err) {
    console.warn('Error querying group_invites in join:', err);
  }

  if (!convId && localCache) {
    convId = localCache.conversationId;
  }

  if (!convId) {
    throw new Error('Invalid or expired group access code. Please verify the code with a group admin.');
  }

  const now = new Date().toISOString();

  // 3. Add current user as member to conversation_members table
  try {
    const { error: joinErr } = await supabase.from('conversation_members').insert({
      conversation_id: convId,
      user_id: currentUserId,
      role: 'member',
      joined_at: now,
    });

    if (joinErr) {
      const isDuplicate =
        joinErr.code === '23505' ||
        joinErr.message?.toLowerCase().includes('duplicate key') ||
        joinErr.message?.toLowerCase().includes('unique');

      if (!isDuplicate) {
        console.error('Error inserting conversation_members:', joinErr);
        throw new Error(`Failed to join group: ${joinErr.message}`);
      }
    }
  } catch (insertErr: any) {
    if (insertErr?.message?.includes('Failed to join group')) {
      throw insertErr;
    }
  }

  // 4. Now that user is definitely a member, RLS allows fetching full conversation details
  const fullConv = await fetchConversationById(convId, currentUserId);
  if (fullConv) {
    return {
      ...fullConv,
      inviteCode: cleanCode,
    };
  }

  // 5. Direct fallback query on conversations
  const { data: convData } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', convId)
    .maybeSingle();

  return {
    id: convId,
    name: convData?.name || localCache?.name || 'Group Conversation',
    type: 'group',
    avatar:
      convData?.avatar_url ||
      localCache?.avatarUrl ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(convData?.name || convId)}`,
    unreadCount: 0,
    updatedAt: 'Just now',
    participantIds: [currentUserId],
    participants: [
      {
        id: currentUserId,
        name: 'You',
        email: '',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
      },
    ],
    currentUserRole: 'member',
    inviteCode: cleanCode,
  };
}

// Clipboard helper for text
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

// Clipboard helper for image
export async function copyImageToClipboard(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch image binary');
      const blob = await response.blob();
      
      // Convert to png blob if needed for standard clipboard item support
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = imageUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const converted = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/png')
          );
          if (converted) pngBlob = converted;
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ]);
      return { success: true };
    }
    return { success: false, error: 'Clipboard API not supported in this browser' };
  } catch (err: any) {
    console.warn('Image clipboard copy error:', err);
    return { success: false, error: err?.message || 'Failed to copy image' };
  }
}


// Fetch all messages for a conversation ordered chronologically with read receipts
export async function fetchConversationMessages(
  conversationId: string,
  currentUserId?: string
): Promise<Message[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_MESSAGES[conversationId] || [];
  }

  try {
    // Attempt to query with extended media and reply columns
    let rawList: any[] = [];
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, message_type, file_url, file_name, file_size, file_type, reply_to_id, created_at, edited_at, deleted_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback query if newer columns are not in user table schema yet
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, message_type, file_url, created_at, edited_at, deleted_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fallbackError) {
        console.error(`Error fetching messages for ${conversationId}:`, fallbackError);
        throw new Error(fallbackError.message);
      }
      rawList = fallbackData || [];
    } else {
      rawList = data || [];
    }

    if (rawList.length === 0) return [];

    // Fetch read receipts from `message_reads` table for these messages
    const messageIds = rawList.map((m) => m.id);
    const readReceiptsByMsg = new Map<string, Set<string>>();

    try {
      const { data: readData, error: readErr } = await supabase
        .from('message_reads')
        .select('message_id, user_id')
        .in('message_id', messageIds);

      if (!readErr && readData) {
        readData.forEach((r: any) => {
          if (!readReceiptsByMsg.has(r.message_id)) {
            readReceiptsByMsg.set(r.message_id, new Set());
          }
          readReceiptsByMsg.get(r.message_id)!.add(r.user_id);
        });
      }
    } catch (readErr) {
      console.warn('Unable to query message_reads table:', readErr);
    }

    // Build lookup map for resolving quoted reply previews
    const messageMap = new Map<string, any>();
    rawList.forEach((m) => messageMap.set(m.id, m));

    return rawList.map((row) => {
      const readers = readReceiptsByMsg.get(row.id);
      // A message is 'read' only if:
      // - Current user sent it (sender_id === currentUserId)
      // - AND someone else (the partner/recipient) has a read receipt for it
      const isRead =
        currentUserId &&
        row.sender_id === currentUserId &&
        readers
          ? Array.from(readers as Set<string>).some((readerId) => readerId !== row.sender_id)
          : false;
      const msgType = (row.message_type || 'text') as any;

      // Resolve replied message preview if reply_to_id exists
      let replyToMessage: RepliedMessagePreview | null = null;
      if (row.reply_to_id && messageMap.has(row.reply_to_id)) {
        const repliedRaw = messageMap.get(row.reply_to_id);
        replyToMessage = {
          id: repliedRaw.id,
          senderId: repliedRaw.sender_id,
          text: repliedRaw.deleted_at ? 'This message was deleted' : repliedRaw.content || '',
          messageType: repliedRaw.message_type || 'text',
          fileName: repliedRaw.file_name || (repliedRaw.file_url ? repliedRaw.file_url.split('/').pop() : null),
        };
      }

      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        text: row.content || '',
        timestamp: formatMessageTimestamp(row.created_at),
        status: isRead ? 'read' : 'sent',
        messageType: msgType,
        fileUrl: row.file_url || null,
        fileName: row.file_name || (row.file_url ? row.file_url.split('/').pop()?.split('?')[0] : null),
        fileSize: row.file_size ? Number(row.file_size) : null,
        fileType: row.file_type || null,
        replyToId: row.reply_to_id || null,
        replyToMessage,
        editedAt: row.edited_at || null,
        deletedAt: row.deleted_at || null,
      };
    });
  } catch (err) {
    console.error('Failed to fetch conversation messages:', err);
    throw err;
  }
}

// Mark messages as read in the `message_reads` table
export async function markMessagesAsRead(
  conversationId: string,
  readerId: string,
  messageIds: string[]
): Promise<void> {
  if (!isSupabaseConfigured() || messageIds.length === 0) {
    return;
  }

  try {
    const now = new Date().toISOString();

    const records = messageIds.map((msgId) => ({
      message_id: msgId,
      user_id: readerId,
      read_at: now,
    }));

    // Attempt upsert ignore duplicates
    const { error: upsertErr } = await supabase
      .from('message_reads')
      .upsert(records, { ignoreDuplicates: true });

    if (upsertErr) {
      // Fallback: check existing and insert individually to avoid conflict errors
      for (const record of records) {
        try {
          const { data: existing } = await supabase
            .from('message_reads')
            .select('id')
            .eq('message_id', record.message_id)
            .eq('user_id', record.user_id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('message_reads').insert(record);
          }
        } catch {
          // ignore duplicate insert errors
        }
      }
    }
  } catch (err) {
    console.warn('Error marking messages as read in DB:', err);
  }
}

// Send a one-to-one or group text message with reply support
export async function sendDirectTextMessage(
  conversationId: string,
  senderId: string,
  content: string,
  replyToId?: string | null,
  replyToMessage?: RepliedMessagePreview | null
): Promise<Message> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }

  const now = new Date().toISOString();
  const messageId = crypto.randomUUID();

  if (!isSupabaseConfigured()) {
    const mockMsg: Message = {
      id: messageId,
      conversationId,
      senderId,
      text: trimmed,
      timestamp: formatMessageTimestamp(now),
      status: 'sent',
      messageType: 'text',
      replyToId: replyToId || null,
      replyToMessage: replyToMessage || null,
    };
    return mockMsg;
  }

  // 1. Insert into Supabase `messages` table with message_type = 'text'
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed,
      message_type: 'text',
      file_url: null,
      reply_to_id: replyToId || null,
      created_at: now,
    })
    .select('id, conversation_id, sender_id, content, message_type, reply_to_id, created_at')
    .single();

  if (error) {
    console.error('Supabase message insert error:', error);
    throw new Error(error.message || 'Failed to send message. Please verify permissions.');
  }

  // 2. Touch the conversation's updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: now })
    .eq('id', conversationId);

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    text: data.content,
    timestamp: formatMessageTimestamp(data.created_at),
    status: 'sent',
    messageType: 'text',
    replyToId: data.reply_to_id || replyToId || null,
    replyToMessage: replyToMessage || null,
  };
}

export interface SendMediaParams {
  conversationId: string;
  senderId: string;
  fileUrl: string;
  filePath?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: MessageType;
  caption?: string;
  replyToId?: string | null;
  replyToMessage?: RepliedMessagePreview | null;
}

// Send a media message (Image, Video, PDF, Document) with Supabase persistence and reply support
export async function sendDirectMediaMessage({
  conversationId,
  senderId,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  category,
  caption = '',
  replyToId,
  replyToMessage,
}: SendMediaParams): Promise<Message> {
  const now = new Date().toISOString();
  const messageId = crypto.randomUUID();
  const trimmedCaption = (caption || '').trim();

  if (!isSupabaseConfigured()) {
    const mockMsg: Message = {
      id: messageId,
      conversationId,
      senderId,
      text: trimmedCaption,
      timestamp: formatMessageTimestamp(now),
      status: 'sent',
      messageType: category,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      replyToId: replyToId || null,
      replyToMessage: replyToMessage || null,
    };
    return mockMsg;
  }

  // Attempt insert with extended metadata columns
  let insertedData: any = null;
  const insertPayload = {
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    content: trimmedCaption,
    message_type: category,
    file_url: fileUrl,
    file_name: fileName,
    file_size: fileSize,
    file_type: fileType,
    reply_to_id: replyToId || null,
    created_at: now,
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.warn('Primary insert failed, attempting compatible fallback insert:', error.message);
    
    // Fallback 1: Try without the new metadata columns, but keep category
    let fallbackResult = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content: trimmedCaption,
        message_type: category,
        file_url: fileUrl,
        reply_to_id: replyToId || null,
        created_at: now,
      })
      .select('*')
      .single();

    if (fallbackResult.error) {
      const simplifiedType = category === 'image' ? 'image' : 'file';
      fallbackResult = await supabase
        .from('messages')
        .insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmedCaption,
          message_type: simplifiedType,
          file_url: fileUrl,
          reply_to_id: replyToId || null,
          created_at: now,
        })
        .select('*')
        .single();
    }

    if (fallbackResult.error) {
      console.error('Supabase media message insert error:', fallbackResult.error);
      throw new Error(fallbackResult.error.message || 'Failed to send media message.');
    }
    insertedData = fallbackResult.data;
  } else {
    insertedData = data;
  }

  // Touch conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: now })
    .eq('id', conversationId);

  return {
    id: insertedData.id,
    conversationId: insertedData.conversation_id,
    senderId: insertedData.sender_id,
    text: insertedData.content || '',
    timestamp: formatMessageTimestamp(insertedData.created_at),
    status: 'sent',
    messageType: category,
    fileUrl: insertedData.file_url || fileUrl,
    fileName: insertedData.file_name || fileName,
    fileSize: insertedData.file_size ? Number(insertedData.file_size) : fileSize,
    fileType: insertedData.file_type || fileType,
    replyToId: insertedData.reply_to_id || replyToId || null,
    replyToMessage: replyToMessage || null,
  };
}

// -------------------------------------------------------------
// Phase 8: Edit & Delete Message Service Operations (Server/DB Authorized)
// -------------------------------------------------------------

// Edit own text message with database authorization check
export async function editDirectMessage(
  conversationId: string,
  messageId: string,
  currentUserId: string,
  newContent: string
): Promise<Message> {
  const trimmed = newContent.trim();
  if (!trimmed) {
    throw new Error('Message text cannot be empty');
  }

  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      text: trimmed,
      timestamp: formatMessageTimestamp(now),
      status: 'sent',
      messageType: 'text',
      editedAt: now,
    };
  }

  // Server/Database authorization enforcement: .eq('sender_id', currentUserId)
  const { data, error } = await supabase
    .from('messages')
    .update({
      content: trimmed,
      edited_at: now,
    })
    .eq('id', messageId)
    .eq('sender_id', currentUserId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error editing message in DB:', error);
    throw new Error(
      error?.message || 'Permission denied: You can only edit your own messages.'
    );
  }

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    text: data.content,
    timestamp: formatMessageTimestamp(data.created_at),
    status: 'sent',
    messageType: data.message_type || 'text',
    fileUrl: data.file_url || null,
    fileName: data.file_name || null,
    fileSize: data.file_size ? Number(data.file_size) : null,
    fileType: data.file_type || null,
    replyToId: data.reply_to_id || null,
    editedAt: data.edited_at || now,
    deletedAt: data.deleted_at || null,
  };
}

// Delete own message (soft delete) with database authorization check
export async function deleteDirectMessage(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<void> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return;
  }

  // Server/Database authorization enforcement: .eq('sender_id', currentUserId)
  const { error } = await supabase
    .from('messages')
    .update({
      deleted_at: now,
      content: 'This message was deleted',
      file_url: null,
    })
    .eq('id', messageId)
    .eq('sender_id', currentUserId);

  if (error) {
    console.error('Error deleting message in DB:', error);
    throw new Error(
      error.message || 'Permission denied: You can only delete your own messages.'
    );
  }
}

// -------------------------------------------------------------
// Phase 5 & 6: Supabase Realtime Subscriptions, Presence, Typing & Read Receipts
// -------------------------------------------------------------

export interface RealtimeMessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'pdf' | 'document' | 'file';
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  reply_to_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface ConversationRealtimeCallbacks {
  onNewMessage: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string, conversationId: string) => void;
  onMessagesRead?: (messageIds: string[], readerId: string, readAt: string) => void;
  onMessageDelivered?: (messageIds: string[]) => void;
  onPartnerPresenceChange: (presence: { isOnline: boolean; lastSeen?: string }) => void;
  onPartnerTypingChange: (isTyping: boolean, username?: string) => void;
  onSubscribed?: () => void;
}

export interface ConversationRealtimeSubscription {
  channel: RealtimeChannel | null;
  broadcastNewMessage: (message: Message) => Promise<void>;
  broadcastMessageUpdated: (message: Message) => Promise<void>;
  broadcastMessageDeleted: (messageId: string) => Promise<void>;
  broadcastMessagesRead: (messageIds: string[]) => Promise<void>;
  broadcastMessageDelivered: (messageIds: string[]) => Promise<void>;
  sendTyping: (isTyping: boolean) => Promise<void>;
  unsubscribe: () => void;
}

export function subscribeToConversationRealtime(
  conversationId: string,
  currentUserId: string,
  currentUserName: string,
  partnerId: string | undefined,
  callbacks: ConversationRealtimeCallbacks
): ConversationRealtimeSubscription {
  if (!isSupabaseConfigured()) {
    return {
      channel: null,
      broadcastNewMessage: async () => {},
      broadcastMessageUpdated: async () => {},
      broadcastMessageDeleted: async () => {},
      broadcastMessagesRead: async () => {},
      broadcastMessageDelivered: async () => {},
      sendTyping: async () => {},
      unsubscribe: () => {},
    };
  }

  // Create scoped channel for this specific conversation context
  const channelName = `conversation:${conversationId}`;
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: currentUserId,
      },
      broadcast: {
        self: false,
      },
    },
  });

  // 1. Listen for new messages inserted via Postgres Replication
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      const row = payload.new as RealtimeMessagePayload;
      if (!row) return;
      const formattedMessage: Message = {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        text: row.content || '',
        timestamp: formatMessageTimestamp(row.created_at),
        status: row.sender_id === currentUserId ? 'sent' : 'read',
        messageType: row.message_type || 'text',
        fileUrl: row.file_url || null,
        fileName: row.file_name || (row.file_url ? row.file_url.split('/').pop()?.split('?')[0] : null),
        fileSize: row.file_size ? Number(row.file_size) : null,
        fileType: row.file_type || null,
        replyToId: row.reply_to_id || null,
        deletedAt: row.deleted_at || null,
      };
      if (row.deleted_at && callbacks.onMessageDeleted) {
        callbacks.onMessageDeleted(row.id, row.conversation_id);
      } else {
        callbacks.onNewMessage(formattedMessage);
      }
    }
  );

  // 2. Listen for Postgres UPDATE events (message edited, deleted, or updated)
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      const row = payload.new as any;
      if (!row) return;
      if (row.deleted_at) {
        if (callbacks.onMessageDeleted) {
          callbacks.onMessageDeleted(row.id, row.conversation_id);
        }
      } else if (callbacks.onMessageUpdated) {
        const formatted: Message = {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          text: row.content || '',
          timestamp: formatMessageTimestamp(row.created_at),
          status: row.sender_id === currentUserId ? 'sent' : 'read',
          messageType: row.message_type || 'text',
          fileUrl: row.file_url || null,
          fileName: row.file_name || null,
          fileSize: row.file_size ? Number(row.file_size) : null,
          fileType: row.file_type || null,
          editedAt: row.edited_at || new Date().toISOString(),
          deletedAt: null,
        };
        callbacks.onMessageUpdated(formatted);
      }
    }
  );

  // 2b. Listen for Postgres INSERT events on `message_reads` table
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'message_reads',
    },
    (payload) => {
      const row = payload.new as any;
      if (!row || !row.message_id || !row.user_id) return;
      if (callbacks.onMessagesRead) {
        callbacks.onMessagesRead([row.message_id], row.user_id, row.read_at || new Date().toISOString());
      }
    }
  );

  // 3. Listen for instant peer-to-peer message broadcasts
  channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
    if (payload && payload.id && payload.conversationId === conversationId) {
      callbacks.onNewMessage(payload as Message);
    }
  });

  // 4. Listen for message edit broadcasts
  channel.on('broadcast', { event: 'message_updated' }, ({ payload }) => {
    if (payload && payload.id && payload.conversationId === conversationId && callbacks.onMessageUpdated) {
      callbacks.onMessageUpdated(payload as Message);
    }
  });

  // 5. Listen for message delete broadcasts
  channel.on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
    if (payload && payload.messageId && payload.conversationId === conversationId && callbacks.onMessageDeleted) {
      callbacks.onMessageDeleted(payload.messageId, payload.conversationId);
    }
  });

  // 7. Listen for read receipt broadcast events
  channel.on('broadcast', { event: 'messages_read' }, ({ payload }) => {
    if (
      payload &&
      payload.conversationId === conversationId &&
      payload.messageIds &&
      payload.messageIds.length > 0 &&
      callbacks.onMessagesRead
    ) {
      callbacks.onMessagesRead(
        payload.messageIds,
        payload.readerId,
        payload.readAt || new Date().toISOString()
      );
    }
  });

  // 7b. Listen for delivered broadcast events
  channel.on('broadcast', { event: 'message_delivered' }, ({ payload }) => {
    if (
      payload &&
      payload.conversationId === conversationId &&
      payload.messageIds &&
      payload.messageIds.length > 0 &&
      callbacks.onMessageDelivered
    ) {
      callbacks.onMessageDelivered(payload.messageIds);
    }
  });

  // 8. Listen for typing broadcast events
  channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
    if (payload && payload.userId !== currentUserId) {
      callbacks.onPartnerTypingChange(
        Boolean(payload.isTyping),
        payload.username || 'Partner'
      );
    }
  });

  // 9. Listen for Presence tracking events (Online / Offline / Last seen)
  const computePartnerPresence = () => {
    if (!partnerId) return;
    const state = channel.presenceState();
    const partnerPresences = state[partnerId];
    if (partnerPresences && partnerPresences.length > 0) {
      const latest = partnerPresences[partnerPresences.length - 1] as any;
      callbacks.onPartnerPresenceChange({
        isOnline: true,
        lastSeen: latest?.online_at || new Date().toISOString(),
      });
    } else {
      callbacks.onPartnerPresenceChange({
        isOnline: false,
        lastSeen: new Date().toISOString(),
      });
    }
  };

  channel
    .on('presence', { event: 'sync' }, () => {
      computePartnerPresence();
    })
    .on('presence', { event: 'join' }, ({ key }) => {
      if (partnerId && key === partnerId) {
        callbacks.onPartnerPresenceChange({ isOnline: true });
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (partnerId && key === partnerId) {
        const latest = leftPresences?.[leftPresences.length - 1] as any;
        callbacks.onPartnerPresenceChange({
          isOnline: false,
          lastSeen: latest?.online_at || new Date().toISOString(),
        });
      }
    });

  let isSubscribed = false;

  // Subscribe and track presence
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      try {
        await channel.track({
          user_id: currentUserId,
          username: currentUserName,
          online_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Realtime presence track error:', err);
      }
      if (callbacks.onSubscribed) {
        callbacks.onSubscribed();
      }
    } else {
      isSubscribed = false;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Realtime channel status: ${status} on ${channelName}`);
      }
    }
  });

  const broadcastNewMessage = async (msg: Message) => {
    if (!isSubscribed || channel.state !== 'joined') return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: msg,
      });
    } catch (err) {
      console.warn('Realtime broadcastNewMessage error:', err);
    }
  };

  const broadcastMessageUpdated = async (msg: Message) => {
    if (!isSubscribed || channel.state !== 'joined') return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'message_updated',
        payload: msg,
      });
    } catch (err) {
      console.warn('Realtime broadcastMessageUpdated error:', err);
    }
  };

  const broadcastMessageDeleted = async (messageId: string) => {
    if (!isSubscribed || channel.state !== 'joined') return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'message_deleted',
        payload: {
          conversationId,
          messageId,
        },
      });
    } catch (err) {
      console.warn('Realtime broadcastMessageDeleted error:', err);
    }
  };

  const broadcastMessagesRead = async (messageIds: string[]) => {
    if (!isSubscribed || channel.state !== 'joined' || messageIds.length === 0) return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'messages_read',
        payload: {
          conversationId,
          readerId: currentUserId,
          messageIds,
          readAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('Realtime broadcastMessagesRead error:', err);
    }
  };

  const broadcastMessageDelivered = async (messageIds: string[]) => {
    if (!isSubscribed || channel.state !== 'joined' || messageIds.length === 0) return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'message_delivered',
        payload: {
          conversationId,
          messageIds,
        },
      });
    } catch (err) {
      console.warn('Realtime broadcastMessageDelivered error:', err);
    }
  };

  const sendTyping = async (isTyping: boolean) => {
    if (!isSubscribed || channel.state !== 'joined') return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          username: currentUserName,
          isTyping,
        },
      });
    } catch (err) {
      console.warn('Realtime sendTyping error:', err);
    }
  };

  const unsubscribe = () => {
    try {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('Error cleaning up Realtime channel:', err);
    }
  };

  return {
    channel,
    broadcastNewMessage,
    broadcastMessageUpdated,
    broadcastMessageDeleted,
    broadcastMessagesRead,
    broadcastMessageDelivered,
    sendTyping,
    unsubscribe,
  };
}
