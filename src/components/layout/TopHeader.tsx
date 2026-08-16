import React from 'react';
import { Search, ArrowLeft, Settings, User as UserIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { User, NavigationTab } from '../../types';

interface TopHeaderProps {
  currentUser: User;
  activeTab: NavigationTab;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab,
  title,
  showBack,
  onBack,
  onSearchClick,
  onProfileClick,
}) => {
  const displayTitle = title || (activeTab === 'chats' ? 'Alap' : activeTab === 'contacts' ? 'Contacts' : 'Profile & Settings');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 w-full transition-colors">
      <div className="flex justify-between items-center px-5 py-3 max-w-[600px] md:max-w-none mx-auto w-full relative">
        {/* Leading area */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onProfileClick}
              className="group cursor-pointer flex items-center focus:outline-none"
              title="View Profile"
            >
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="md"
                className="transition-transform group-hover:scale-105"
              />
            </button>
          )}
        </div>

        {/* Title */}
        <h1
          className={`text-2xl font-bold tracking-tight text-indigo-600 text-center absolute left-1/2 -translate-x-1/2 ${
            displayTitle === 'Alap' ? 'font-brand' : ''
          }`}
        >
          {displayTitle}
        </h1>

        {/* Trailing area */}
        <div className="flex items-center gap-1">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              aria-label="Search"
              className="p-2 rounded-full text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          {onProfileClick && !showBack && (
            <button
              onClick={onProfileClick}
              aria-label="Settings"
              className="p-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer md:hidden"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
