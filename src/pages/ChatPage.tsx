import React, { useState } from 'react';
import { Conversation, Message, User, NavigationTab, RepliedMessagePreview } from '../types';
import { ChatList } from '../components/chat/ChatList';
import { ActiveConversation } from '../components/chat/ActiveConversation';
import { EmptyState } from '../components/chat/EmptyState';
import { NewChatModal, NewChatTab } from '../components/chat/NewChatModal';

interface ChatPageProps {
  currentUser: User;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  contacts: User[];
  activeTab: NavigationTab;
  selectedConversationId: string | null;
  isConversationsLoading?: boolean;
  isLoadingMessages?: boolean;
  messagesError?: string | null;
  typingUser?: string | null;
  onRetryLoadMessages?: () => void;
  onSelectConversation: (id: string | null) => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => Promise<void> | void;
  onSendMediaMessage?: (
    conversationId: string,
    file: File,
    caption: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
    replyToId?: string | null,
    replyToMessage?: RepliedMessagePreview | null
  ) => Promise<void>;
  onEditMessage?: (conversationId: string, messageId: string, newText: string) => Promise<void> | void;
  onDeleteMessage?: (conversationId: string, messageId: string) => Promise<void> | void;
  onTyping?: (isTyping: boolean) => void;
  onCreateNewChat: (contact: User) => Promise<string | void> | void;
  onCreateGroup?: (groupData: {
    name: string;
    avatarUrl?: string;
    memberUserIds: string[];
  }) => Promise<string | void>;
  onJoinGroup?: (code: string) => Promise<string | void>;
  onConversationUpdated?: (updated: Partial<Conversation>) => void;
  onLeaveConversation?: (conversationId: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  currentUser,
  conversations,
  messages,
  contacts,
  selectedConversationId,
  isConversationsLoading = false,
  isLoadingMessages = false,
  messagesError = null,
  typingUser = null,
  onRetryLoadMessages,
  onSelectConversation,
  onSendMessage,
  onSendMediaMessage,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onCreateNewChat,
  onCreateGroup,
  onJoinGroup,
  onConversationUpdated,
  onLeaveConversation,
}) => {
  const [modalTab, setModalTab] = useState<NewChatTab | null>(null);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  ) || (conversations.length > 0 && !selectedConversationId ? conversations[0] : undefined);

  const activeMessages = selectedConversation
    ? messages[selectedConversation.id] || []
    : [];

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    setModalTab(null);
  };

  const handleSelectContactForNewChat = async (contact: User) => {
    const newOrExistingId = await onCreateNewChat(contact);
    setModalTab(null);
    if (typeof newOrExistingId === 'string') {
      onSelectConversation(newOrExistingId);
    } else {
      const found = conversations.find(
        (c) => c.participantIds.includes(contact.id) && c.type === 'direct'
      );
      if (found) {
        onSelectConversation(found.id);
      }
    }
  };

  const handleCreateGroup = async (groupData: {
    name: string;
    avatarUrl?: string;
    memberUserIds: string[];
  }) => {
    if (!onCreateGroup) return;
    const newGroupId = await onCreateGroup(groupData);
    setModalTab(null);
    if (typeof newGroupId === 'string') {
      onSelectConversation(newGroupId);
    }
  };

  const handleJoinGroup = async (code: string) => {
    if (!onJoinGroup) return;
    const joinedGroupId = await onJoinGroup(code);
    setModalTab(null);
    if (typeof joinedGroupId === 'string') {
      onSelectConversation(joinedGroupId);
    }
  };

  if (modalTab !== null) {
    return (
      <NewChatModal
        contacts={contacts}
        initialTab={modalTab}
        onSelectContact={handleSelectContactForNewChat}
        onCreateGroup={onCreateGroup ? handleCreateGroup : undefined}
        onJoinGroup={onJoinGroup ? handleJoinGroup : undefined}
        onBack={() => setModalTab(null)}
      />
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 h-full flex-col shrink-0 ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatList
          conversations={conversations}
          activeConversationId={selectedConversation?.id}
          isLoading={isConversationsLoading}
          onSelectConversation={handleSelectConversation}
          onNewChatClick={(tab = 'direct') => setModalTab(tab)}
        />
      </div>

      {/* Main Active Conversation or Empty State */}
      <div
        className={`flex-1 h-full relative ${
          selectedConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConversation ? (
          <ActiveConversation
            conversation={selectedConversation}
            messages={activeMessages}
            currentUser={currentUser}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
            typingUser={typingUser}
            onRetryLoadMessages={onRetryLoadMessages}
            onSendMessage={(text, replyToId, replyToMessage) =>
              onSendMessage(selectedConversation.id, text, replyToId, replyToMessage)
            }
            onSendMediaMessage={
              onSendMediaMessage
                ? (file, caption, onProgress, signal, replyToId, replyToMessage) =>
                    onSendMediaMessage(selectedConversation.id, file, caption, onProgress, signal, replyToId, replyToMessage)
                : undefined
            }
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onTyping={onTyping}
            onBack={() => onSelectConversation(null)}
            onConversationUpdated={onConversationUpdated}
            onLeaveConversation={onLeaveConversation}
          />
        ) : (
          <EmptyState onStartNewChat={() => setModalTab('direct')} />
        )}
      </div>
    </div>
  );
};
