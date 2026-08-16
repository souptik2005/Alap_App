export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'direct' | 'group';
export type GroupMemberRole = 'admin' | 'member';

export interface DbConversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConversationMember {
  id?: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  role: GroupMemberRole | string;
  profile?: Profile;
}

export interface DbGroupInvite {
  id: string;
  conversation_id: string;
  code: string;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

export interface GroupMember {
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
  user: User;
}

export interface GroupInvite {
  id: string;
  conversationId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  revokedAt?: string | null;
  isActive: boolean;
}

export interface GroupPreview {
  conversationId: string;
  name: string;
  avatarUrl: string | null;
  memberCount: number;
  isMember: boolean;
  currentUserRole?: GroupMemberRole;
}

export type MessageType = 'text' | 'image' | 'video' | 'pdf' | 'document' | 'file';

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  file_url: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface DbMessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar: string;
  statusText?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface MediaAttachment {
  type: MessageType;
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface RepliedMessagePreview {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  messageType?: MessageType;
  fileName?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  messageType?: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  replyToId?: string | null;
  replyToMessage?: RepliedMessagePreview | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  senderProfile?: Profile;
  attachments?: {
    type: 'image' | 'video' | 'pdf' | 'document' | 'file';
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }[];
}

export interface StagedMediaFile {
  file: File;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: MessageType;
  caption: string;
  uploadProgress?: number;
  isUploading?: boolean;
}

export type AccentKey = 'indigo' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet';

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatar?: string;
  accent?: AccentKey;
  unreadCount: number;
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
    senderName?: string;
  };
  updatedAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  participantIds: string[];
  participants: User[];
  otherUser?: User;
  currentUserRole?: GroupMemberRole;
  createdBy?: string;
  groupMembers?: GroupMember[];
  inviteCode?: string | null;
}

export type NavigationTab = 'chats' | 'contacts' | 'profile' | 'settings';
export type AppRoute =
  | 'home'
  | 'chat'
  | 'login'
  | 'signup'
  | 'settings'
  | 'forgot-password'
  | 'reset-password'
  | 'update-password';

