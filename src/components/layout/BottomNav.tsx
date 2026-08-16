import React from 'react';
import { MessagesSquare, Users, Settings } from 'lucide-react';
import { NavigationTab } from '../../types';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-2 shadow-xs">
      <div className="flex justify-around items-center max-w-[600px] mx-auto">
        {/* Chats Tab */}
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition-all cursor-pointer relative ${
            activeTab === 'chats'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <div className="relative">
            <MessagesSquare className="w-5 h-5 mb-0.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium">Chats</span>
        </button>

        {/* Contacts Tab */}
        <button
          type="button"
          onClick={() => onTabChange('contacts')}
          className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-emerald-500 text-white font-semibold shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium">People</span>
        </button>

        {/* Profile/Settings Tab */}
        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'profile' || activeTab === 'settings'
              ? 'bg-amber-500 text-white font-semibold shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium">Settings</span>
        </button>
      </div>
    </nav>
  );
};
