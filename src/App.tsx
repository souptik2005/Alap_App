import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Conversation,
  Message,
  NavigationTab,
  AppRoute,
  RepliedMessagePreview,
} from './types';
import {
  CURRENT_USER,
  MOCK_USERS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
} from './lib/mockData';
import { getCurrentFormattedTime } from './lib/utils';
import {
  fetchUserConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  joinGroupByCode,
  fetchConversationMessages,
  markMessagesAsRead,
  sendDirectTextMessage,
  sendDirectMediaMessage,
  editDirectMessage,
  deleteDirectMessage,
  subscribeToConversationRealtime,
  ConversationRealtimeSubscription,
} from './lib/chatService';
import { uploadMediaFile, validateMediaFile } from './lib/storageService';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { sendBrowserNotification } from './lib/notificationService';

import { TopHeader } from './components/layout/TopHeader';
import { BottomNav } from './components/layout/BottomNav';
import { DesktopSidebar } from './components/layout/DesktopSidebar';

import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { NewChatModal } from './components/chat/NewChatModal';
import { MessageSquare } from 'lucide-react';

function MainApp() {
  const { user, profile, loading, signOut } = useAuth();

  // App route state (synced with window.location.pathname)
  const [route, setRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    // Check if recovery token is present in hash or url
    if (
      path === '/update-password' ||
      path === '/reset-password' ||
      hash.includes('type=recovery') ||
      hash.includes('error=access_denied')
    ) {
      return 'update-password';
    }
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/login') return 'login';
    if (path === '/signup') return 'signup';
    if (path === '/settings') return 'settings';
    return 'chat';
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('chats');
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [contacts] = useState<User[]>(MOCK_USERS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [partnerTypingUser, setPartnerTypingUser] = useState<string | null>(null);

  const activeRealtimeSubRef = useRef<ConversationRealtimeSubscription | null>(null);
  const conversationsRef = useRef(conversations);
  const messagesRef = useRef(messages);
  const selectedConversationIdRef = useRef(selectedConversationId);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Sync navigation route with browser URL history
  const navigateTo = (newRoute: AppRoute) => {
    setRoute(newRoute);
    const pathMap: Record<AppRoute, string> = {
      home: '/',
      chat: '/',
      login: '/login',
      signup: '/signup',
      settings: '/settings',
      'forgot-password': '/forgot-password',
      'reset-password': '/update-password',
      'update-password': '/update-password',
    };
    window.history.pushState({}, '', pathMap[newRoute] || '/');
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === '/update-password' ||
        path === '/reset-password' ||
        hash.includes('type=recovery') ||
        hash.includes('error=access_denied')
      ) {
        setRoute('update-password');
      } else if (path === '/forgot-password') setRoute('forgot-password');
      else if (path === '/login') setRoute('login');
      else if (path === '/signup') setRoute('signup');
      else if (path === '/settings') setRoute('settings');
      else setRoute('chat');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route protection & auth redirect
  useEffect(() => {
    if (loading) return;

    const currentPath = window.location.pathname;
    const isUpdatePasswordRoute =
      currentPath === '/update-password' ||
      currentPath === '/reset-password' ||
      route === 'update-password' ||
      route === 'reset-password';

    const isAuthRoute =
      currentPath === '/login' ||
      currentPath === '/signup' ||
      currentPath === '/forgot-password' ||
      isUpdatePasswordRoute ||
      route === 'login' ||
      route === 'signup' ||
      route === 'forgot-password';

    if (!user) {
      if (!isAuthRoute) {
        navigateTo('login');
      }
    } else {
      // If user is actively on update-password (from recovery email or link), let them stay to update password
      if (isUpdatePasswordRoute) {
        return;
      }
      if (isAuthRoute) {
        navigateTo('chat');
      }
    }
  }, [user, loading, route]);

  // Sync Supabase user/profile data into currentUser state
  useEffect(() => {
    if (user) {
      const displayName =
        profile?.display_name ||
        profile?.username ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'You';

      const avatarUrl =
        profile?.avatar_url ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

      const bioText = profile?.bio || 'Available';

      setCurrentUser({
        id: user.id,
        name: displayName,
        username: profile?.username || user.user_metadata?.username,
        email: user.email || '',
        avatar: avatarUrl,
        statusText: bioText,
        bio: bioText,
        isOnline: true,
      });
    }
  }, [user, profile]);

  // Load conversations from Supabase
  const loadConversations = useCallback(async () => {
    if (!user) {
      if (!isSupabaseConfigured()) {
        setConversations(MOCK_CONVERSATIONS);
      }
      return;
    }

    setIsConversationsLoading(true);
    try {
      const convs = await fetchUserConversations(user.id);
      setConversations(convs);
      if (convs.length > 0) {
        setSelectedConversationId((prev) => prev || convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (!isSupabaseConfigured()) {
        setConversations(MOCK_CONVERSATIONS);
      }
    } finally {
      setIsConversationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Global realtime listener — tracks new messages across ALL conversations
  // and increments unreadCount for any conversation not currently open
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    const globalChannel = supabase
      .channel(`global_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          // Only react to messages sent by someone else
          if (row.sender_id === user.id) return;
          // Skip if this conversation is already open (the per-conversation sub handles it)
          if (row.conversation_id === selectedConversationIdRef.current) return;
          // Only increment if this conversation belongs to the user
          const convExists = conversationsRef.current.some(
            (c) => c.id === row.conversation_id
          );
          if (!convExists) return;

          setConversations((prev) =>
            prev.map((c) =>
              c.id === row.conversation_id
                ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user]);

  // Fetch Message History whenever selectedConversationId changes
  const loadMessagesForConversation = useCallback(
    async (convId: string) => {
      if (!convId) return;
      setIsLoadingMessages(true);
      setMessagesError(null);

      try {
        const msgs = await fetchConversationMessages(convId, user?.id);

        // Automatically mark unread messages sent by the partner as read
        let updatedMsgs = msgs;
        if (user) {
          const unreadPartnerMsgIds = msgs
            .filter((m) => m.senderId !== user.id && m.status !== 'read')
            .map((m) => m.id);

          if (unreadPartnerMsgIds.length > 0) {
            markMessagesAsRead(convId, user.id, unreadPartnerMsgIds);
            activeRealtimeSubRef.current?.broadcastMessagesRead(unreadPartnerMsgIds);

            // Mark them as read locally
            updatedMsgs = msgs.map((m) =>
              m.senderId !== user.id ? { ...m, status: 'read' as const } : m
            );
          }

          // Reset unread count for this conversation in the conversation list
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }

        setMessages((prev) => {
          const existing = prev[convId] || [];
          const merged = updatedMsgs.map((newMsg) => {
            const oldMsg = existing.find((m) => m.id === newMsg.id);
            if (oldMsg?.status === 'read') {
              return { ...newMsg, status: 'read' as const };
            }
            return newMsg;
          });
          return {
            ...prev,
            [convId]: merged,
          };
        });
      } catch (err: any) {
        console.error('Failed to load messages for conversation:', err);
        setMessagesError(err?.message || 'Could not load messages');
        // Fallback to local / mock if available
        if (!isSupabaseConfigured() && MOCK_MESSAGES[convId]) {
          setMessages((prev) => ({
            ...prev,
            [convId]: MOCK_MESSAGES[convId],
          }));
        }
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (selectedConversationId) {
      loadMessagesForConversation(selectedConversationId);
    }
  }, [selectedConversationId, loadMessagesForConversation]);

  // Realtime subscription for the active conversation (messages, presence, typing, read receipts)
  useEffect(() => {
    if (!selectedConversationId || !user) {
      return;
    }

    const currentConv = conversationsRef.current.find(
      (c) => c.id === selectedConversationId
    );

    const partner =
      currentConv?.otherUser ||
      currentConv?.participants.find((p) => p.id !== user.id) ||
      (currentConv?.participantIds.find((id) => id !== user.id)
        ? { id: currentConv.participantIds.find((id) => id !== user.id)! }
        : undefined);

    const partnerId = partner?.id;

    // Reset typing state on conversation switch
    setPartnerTypingUser(null);

    const sub = subscribeToConversationRealtime(
      selectedConversationId,
      user.id,
      currentUser.name,
      partnerId,
      {
        onNewMessage: (newMsg) => {
          // 1. Deduplicate & append or replace optimistic message
          setMessages((prev) => {
            const list = prev[newMsg.conversationId] || [];
            
            // If already in list by exact ID, just preserve existing (don't overwrite read status)
            if (list.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            // If sent by self, replace optimistic temp message
            const tempIdx = list.findIndex(
              (m) =>
                m.id.startsWith('temp_') &&
                m.senderId === newMsg.senderId &&
                m.text === newMsg.text
            );
            if (tempIdx !== -1) {
              const updated = [...list];
              updated[tempIdx] = { ...newMsg, status: newMsg.status };
              return { ...prev, [newMsg.conversationId]: updated };
            }
            return {
              ...prev,
              [newMsg.conversationId]: [...list, newMsg],
            };
          });

          // 2. If the user currently has this conversation open and message is from partner:
          // mark it as read on our side (we're actively viewing the conversation)
          if (newMsg.senderId !== user.id) {
            // Trigger native browser notification if user gave permission
            sendBrowserNotification(`New message from ${currentConv?.name || 'Alap'}`, {
              body: newMsg.text || 'Sent an attachment',
            });

            const activeId = selectedConversationIdRef.current || selectedConversationId;
            if (newMsg.conversationId === activeId) {
              // Conversation is open — mark as read (skip delivered, go straight to read)
              markMessagesAsRead(newMsg.conversationId, user.id, [newMsg.id]);
              sub.broadcastMessagesRead([newMsg.id]);
            } else {
              // Conversation is NOT open — message delivered to device but not yet seen
              sub.broadcastMessageDelivered([newMsg.id]);
            }
          }

          // 3. Update conversation snippet in sidebar list
          const activeId = selectedConversationIdRef.current || selectedConversationId;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === newMsg.conversationId) {
                return {
                  ...c,
                  lastMessage: {
                    text: newMsg.text,
                    timestamp: newMsg.timestamp,
                    senderId: newMsg.senderId,
                    senderName:
                      newMsg.senderId === user.id ? 'You' : c.name,
                  },
                  updatedAt: 'Just now',
                  unreadCount:
                    c.id === activeId
                      ? 0
                      : (c.unreadCount || 0) + (newMsg.senderId !== user.id ? 1 : 0),
                };
              }
              return c;
            })
          );
        },

        onMessagesRead: (messageIds, readerId) => {
          if (readerId === user.id) return;
          
          setMessages((prev) => {
            let stateChanged = false;
            const next = { ...prev };

            for (const convId of Object.keys(next)) {
              const list = next[convId];
              let listChanged = false;
              
              const updated = list.map((m) => {
                if (messageIds.includes(m.id) && m.senderId === user.id && m.status !== 'read') {
                  listChanged = true;
                  stateChanged = true;
                  return { ...m, status: 'read' as const };
                }
                return m;
              });

              if (listChanged) {
                next[convId] = updated;
              }
            }

            return stateChanged ? next : prev;
          });
        },

        onMessageDelivered: (messageIds) => {
          setMessages((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const convId of Object.keys(next)) {
              const updated = next[convId].map((m) => {
                if (messageIds.includes(m.id) && m.senderId === user.id && m.status === 'sent') {
                  changed = true;
                  return { ...m, status: 'delivered' as const };
                }
                return m;
              });
              if (changed) next[convId] = updated;
            }
            return changed ? next : prev;
          });
        },

        onMessageUpdated: (updatedMsg) => {
          setMessages((prev) => {
            const list = prev[updatedMsg.conversationId] || [];
            return {
              ...prev,
              [updatedMsg.conversationId]: list.map((m) =>
                m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
              ),
            };
          });
        },

        onMessageDeleted: (msgId, convId) => {
          const now = new Date().toISOString();
          setMessages((prev) => {
            const list = prev[convId] || [];
            return {
              ...prev,
              [convId]: list.map((m) =>
                m.id === msgId
                  ? { ...m, text: 'This message was deleted', deletedAt: now, fileUrl: null }
                  : m
              ),
            };
          });
        },

        onPartnerPresenceChange: (presence) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === selectedConversationId) {
                const updatedOtherUser = c.otherUser
                  ? {
                      ...c.otherUser,
                      isOnline: presence.isOnline,
                      lastSeen: presence.lastSeen || c.otherUser.lastSeen,
                    }
                  : undefined;
                return {
                  ...c,
                  isOnline: presence.isOnline,
                  lastSeen: presence.lastSeen || c.lastSeen,
                  otherUser: updatedOtherUser,
                };
              }
              return c;
            })
          );
        },

        onPartnerTypingChange: (isTyping, username) => {
          setPartnerTypingUser(isTyping ? username || 'Partner' : null);
        },
        onSubscribed: () => {
          const list = messagesRef.current[selectedConversationId] || [];
          const partnerMsgIds = list
            .filter((m) => m.senderId !== user.id)
            .map((m) => m.id);

          if (partnerMsgIds.length > 0) {
            // Use the local sub instance for broadcasting read receipts to avoid null reference
            sub.broadcastMessagesRead(partnerMsgIds);
          }
        },
      }
    );

    activeRealtimeSubRef.current = sub;

    return () => {
      sub.unsubscribe();
      activeRealtimeSubRef.current = null;
      setPartnerTypingUser(null);
    };
  }, [selectedConversationId, user, currentUser.name]);

  const handleBroadcastTyping = useCallback((isTyping: boolean) => {
    activeRealtimeSubRef.current?.sendTyping(isTyping);
  }, []);

  // Handle Tab navigation
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === 'chats' || tab === 'contacts') {
      navigateTo('chat');
    } else if (tab === 'profile' || tab === 'settings') {
      navigateTo('settings');
    }
  };

  // Handle message sending (Text only with Reply support)
  const handleSendMessage = async (
    conversationId: string,
    text: string,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. Optimistic message representation
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      text: trimmed,
      timestamp: getCurrentFormattedTime(),
      status: 'sent',
      replyToId: replyToId || null,
      replyToMessage: replyToMessage || null,
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMsg],
    }));

    // Update conversation list preview optimistically
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: {
              text: trimmed,
              timestamp: optimisticMsg.timestamp,
              senderId: currentUser.id,
              senderName: 'You',
            },
            updatedAt: 'Just now',
            unreadCount: 0,
          };
        }
        return c;
      })
    );

    // 2. Persist to Supabase `messages` table and broadcast immediately
    try {
      const realMsg = await sendDirectTextMessage(
        conversationId,
        currentUser.id,
        trimmed,
        replyToId,
        replyToMessage
      );

      // Instant peer-to-peer real-time broadcast so receiver gets it with zero latency
      activeRealtimeSubRef.current?.broadcastNewMessage(realMsg);

      // Replace optimistic message with persisted message (safely deduplicated)
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        const existingRealMsg = list.find((m) => m.id === realMsg.id);

        // If already added by Realtime event, just remove the temp placeholder
        if (existingRealMsg) {
          return {
            ...prev,
            [conversationId]: list.filter((m) => m.id !== tempId),
          };
        }
        // Replace temp placeholder with real message — always start as 'sent'
        // status will be upgraded to 'delivered' or 'read' only via specific Realtime events
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            m.id === tempId
              ? { ...realMsg, status: 'sent' as const }
              : m
          ),
        };
      });
    } catch (err: any) {
      console.error('Failed to send text message:', err);
      // Remove optimistic message or display error alert
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(
          (m) => m.id !== tempId
        ),
      }));
      alert(`Message failed to send: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle uploading and sending media messages (Images, Videos, PDFs, Documents)
  const handleSendMediaMessage = async (
    conversationId: string,
    file: File,
    caption: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => {
    // 1. Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    // 2. Upload file to Supabase storage with progress tracking
    const uploadResult = await uploadMediaFile({
      conversationId,
      userId: currentUser.id,
      file,
      onProgress,
      signal,
    });

    // 3. Persist media message in database
    const realMsg = await sendDirectMediaMessage({
      conversationId,
      senderId: currentUser.id,
      fileUrl: uploadResult.fileUrl,
      filePath: uploadResult.filePath,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      fileType: uploadResult.fileType,
      category: uploadResult.category,
      caption,
      replyToId,
      replyToMessage,
    });

    // 4. Update state and peer-to-peer real-time broadcast
    setMessages((prev) => {
      const list = prev[conversationId] || [];
      if (list.some((m) => m.id === realMsg.id)) {
        return prev;
      }
      return {
        ...prev,
        [conversationId]: [...list, realMsg],
      };
    });

    // Update conversation list preview
    const previewText = caption
      ? `${validation.category === 'image' ? '📷 ' : '📎 '}${caption}`
      : validation.category === 'image'
      ? '📷 Photo'
      : validation.category === 'video'
      ? '🎥 Video'
      : validation.category === 'pdf'
      ? '📄 PDF Document'
      : `📎 ${file.name}`;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: {
              text: previewText,
              timestamp: realMsg.timestamp,
              senderId: currentUser.id,
              senderName: 'You',
            },
            updatedAt: 'Just now',
            unreadCount: 0,
          };
        }
        return c;
      })
    );

    activeRealtimeSubRef.current?.broadcastNewMessage(realMsg);
  };

  // Handle editing a text message
  const handleEditMessage = async (
    conversationId: string,
    messageId: string,
    newText: string
  ) => {
    const updatedMsg = await editDirectMessage(
      conversationId,
      messageId,
      currentUser.id,
      newText
    );

    setMessages((prev) => {
      const list = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: list.map((m) =>
          m.id === messageId ? { ...m, ...updatedMsg } : m
        ),
      };
    });

    activeRealtimeSubRef.current?.broadcastMessageUpdated(updatedMsg);
  };

  // Handle soft deleting a message
  const handleDeleteMessage = async (
    conversationId: string,
    messageId: string
  ) => {
    await deleteDirectMessage(conversationId, messageId, currentUser.id);

    const now = new Date().toISOString();
    setMessages((prev) => {
      const list = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: list.map((m) =>
          m.id === messageId
            ? { ...m, text: 'This message was deleted', deletedAt: now, fileUrl: null }
            : m
        ),
      };
    });

    activeRealtimeSubRef.current?.broadcastMessageDeleted(messageId);
  };

  // Handle start/resume direct conversation (preventing duplicates)
  const handleCreateNewChat = async (contact: User): Promise<string> => {
    try {
      const result = await getOrCreateDirectConversation(currentUser.id, contact);
      const targetConv = result.conversation;

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === targetConv.id);
        if (exists) {
          return prev.map((c) => (c.id === targetConv.id ? targetConv : c));
        }
        return [targetConv, ...prev];
      });

      setSelectedConversationId(targetConv.id);

      if (result.isNew && !messages[targetConv.id]) {
        setMessages((prev) => ({
          ...prev,
          [targetConv.id]: [],
        }));
      }

      return targetConv.id;
    } catch (err: any) {
      console.error('Failed to create/get conversation:', err);
      const fallbackId = `conv_${contact.id}`;
      setSelectedConversationId(fallbackId);
      return fallbackId;
    }
  };

  // Handle creating a new group conversation
  const handleCreateGroup = async (groupData: {
    name: string;
    avatarUrl?: string;
    memberUserIds: string[];
  }): Promise<string> => {
    try {
      const newGroupConv = await createGroupConversation({
        name: groupData.name,
        avatarUrl: groupData.avatarUrl,
        memberUserIds: groupData.memberUserIds,
        currentUserId: currentUser.id,
      });

      setConversations((prev) => [newGroupConv, ...prev.filter((c) => c.id !== newGroupConv.id)]);
      setSelectedConversationId(newGroupConv.id);
      setMessages((prev) => ({
        ...prev,
        [newGroupConv.id]: [],
      }));

      return newGroupConv.id;
    } catch (err: any) {
      console.error('Failed to create group:', err);
      alert(`Failed to create group: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  // Handle joining a group via 8-character access code
  const handleJoinGroup = async (code: string): Promise<string> => {
    try {
      const joinedConv = await joinGroupByCode(code, currentUser.id);
      // Reload full conversations list so the new group metadata and members are populated
      await loadConversations();
      setSelectedConversationId(joinedConv.id);
      return joinedConv.id;
    } catch (err: any) {
      console.error('Failed to join group:', err);
      throw err;
    }
  };

  // Handle conversation metadata updates (e.g. name, avatar, members)
  const handleConversationUpdated = (updated: Partial<Conversation>) => {
    if (!selectedConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConversationId ? { ...c, ...updated } : c))
    );
  };

  // Handle leaving a group conversation
  const handleLeaveConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setSelectedConversationId((prev) => {
      if (prev === conversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prev;
    });
  };

  const handleUpdateUser = (updatedData: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedData }));
  };

  const handleLogout = async () => {
    await signOut();
    navigateTo('login');
  };

  // Calculate unread count
  const totalUnreadCount = conversations.reduce(
    (acc, curr) => acc + (curr.unreadCount || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading Alap...</p>
      </div>
    );
  }

  // Render Auth routes
  if (route === 'update-password' || route === 'reset-password') {
    return (
      <UpdatePasswordPage
        onResetSuccess={async () => {
          await signOut();
          navigateTo('login');
        }}
        onNavigateToLogin={() => navigateTo('login')}
      />
    );
  }

  if (route === 'forgot-password' && !user) {
    return (
      <ForgotPasswordPage
        onNavigateToLogin={() => navigateTo('login')}
      />
    );
  }

  if (route === 'signup' && !user) {
    return (
      <SignupPage
        onSignupSuccess={() => navigateTo('chat')}
        onNavigateToLogin={() => navigateTo('login')}
      />
    );
  }

  if (route === 'login' || (!user && route !== 'signup')) {
    return (
      <LoginPage
        onLoginSuccess={() => navigateTo('chat')}
        onNavigateToSignup={() => navigateTo('signup')}
        onNavigateToForgotPassword={() => navigateTo('forgot-password')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop Navigation Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={totalUnreadCount}
      />

      {/* Main Application Container */}
      <div className="flex-1 flex flex-col md:pl-20 h-full w-full overflow-hidden relative">
        {/* Top Header */}
        <TopHeader
          currentUser={currentUser}
          activeTab={activeTab}
          title={
            route === 'settings'
              ? 'Profile & Settings'
              : activeTab === 'contacts'
              ? 'Start Direct Conversation'
              : 'Alap'
          }
          onProfileClick={() => navigateTo('settings')}
        />

        {/* Content Body */}
        <main className="flex-1 h-full w-full overflow-hidden relative">
          {route === 'settings' || activeTab === 'profile' ? (
            <SettingsPage
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
            />
          ) : activeTab === 'contacts' ? (
            <NewChatModal
              contacts={contacts}
              onSelectContact={async (contact) => {
                const convId = await handleCreateNewChat(contact);
                setSelectedConversationId(convId);
                setActiveTab('chats');
                navigateTo('chat');
              }}
              onCreateGroup={async (groupData) => {
                const convId = await handleCreateGroup(groupData);
                setSelectedConversationId(convId);
                setActiveTab('chats');
                navigateTo('chat');
              }}
              onJoinGroup={async (code) => {
                const convId = await handleJoinGroup(code);
                setSelectedConversationId(convId);
                setActiveTab('chats');
                navigateTo('chat');
              }}
              onBack={() => {
                setActiveTab('chats');
                navigateTo('chat');
              }}
            />
          ) : (
            <ChatPage
              currentUser={currentUser}
              conversations={conversations}
              messages={messages}
              contacts={contacts}
              activeTab={activeTab}
              selectedConversationId={selectedConversationId}
              isLoadingMessages={isLoadingMessages}
              messagesError={messagesError}
              onRetryLoadMessages={() => {
                if (selectedConversationId) {
                  loadMessagesForConversation(selectedConversationId);
                }
              }}
              onSelectConversation={setSelectedConversationId}
              onSendMessage={handleSendMessage}
              onSendMediaMessage={handleSendMediaMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onTyping={handleBroadcastTyping}
              typingUser={partnerTypingUser}
              onCreateNewChat={handleCreateNewChat}
              onCreateGroup={handleCreateGroup}
              onJoinGroup={handleJoinGroup}
              onConversationUpdated={handleConversationUpdated}
              onLeaveConversation={handleLeaveConversation}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCount={totalUnreadCount}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
