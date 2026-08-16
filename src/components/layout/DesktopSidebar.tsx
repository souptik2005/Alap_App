import React from 'react';
import {
  MessagesSquare,
  Users,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { NavigationTab, User } from '../../types';
import { Avatar } from '../ui/Avatar';

interface DesktopSidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  currentUser: User;
  onLogout: () => void;
  unreadCount?: number;
}

const navItems: {
  key: NavigationTab;
  label: string;
  Icon: typeof MessagesSquare;
  tint: string;
}[] = [
    { key: 'chats', label: 'Chats', Icon: MessagesSquare, tint: 'bg-indigo-600' },
    { key: 'contacts', label: 'People', Icon: Users, tint: 'bg-emerald-500' },
    { key: 'settings', label: 'Settings', Icon: Settings, tint: 'bg-amber-500' },
  ];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  unreadCount = 0,
}) => {
  return (
    <nav
      aria-label="Primary"
      className="hidden md:flex fixed left-0 top-0 h-full w-20 shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-white py-4 z-30 shadow-xs justify-between"
    >
      <div className="flex flex-col items-center gap-0 pb-3">
        <img
          src="/alap-logo.png"
          alt="Alap"
          className="h-24 w-24 object-contain"
        />
        <span className="-mt-3 font-display text-[18px] italic leading-none text-indigo-700">
          Alap
        </span>
      </div>
      <div className="flex flex-col items-center gap-2.5 my-auto">
        {navItems.map(({ key, label, Icon, tint }) => {
          const isActive = activeTab === key || (key === 'settings' && activeTab === 'profile');
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              aria-label={label}
              title={label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-95 cursor-pointer ${isActive
                ? `${tint} text-white shadow-xs`
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {key === 'chats' && unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          title="View Profile"
          className="relative cursor-pointer transition-transform hover:scale-105"
        >
          <Avatar
            src={currentUser.avatar}
            name={currentUser.name}
            size="md"
            isOnline={true}
          />
        </button>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign Out"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 transition-colors duration-150 ease-out hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
