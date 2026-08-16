import React, { useState, useEffect } from 'react';
import {
  Bell,
  LogOut,
  ChevronRight,
  Check,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Camera,
  Loader2,
} from 'lucide-react';
import { User } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestNotificationPermission } from '../lib/notificationService';
import { uploadAvatarFile } from '../lib/storageService';

interface SettingsPageProps {
  currentUser: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onUpdateUser,
  onLogout,
}) => {
  const { updateProfile, resetPassword, signOut } = useAuth();
  const { showToast } = useToast();
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(currentUser.statusText || 'Available');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState(currentUser.name);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      setIsUploadingAvatar(true);
      showToast('Uploading profile picture...', 'info');

      const avatarUrl = await uploadAvatarFile(currentUser.id, file);
      onUpdateUser({ avatar: avatarUrl });
      await updateProfile({ avatar_url: avatarUrl });

      showToast('Profile picture updated!', 'success');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      showToast(err?.message || 'Failed to upload profile picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleSaveStatus = async () => {
    onUpdateUser({ statusText, bio: statusText });
    await updateProfile({ bio: statusText });
    setIsEditingStatus(false);
    showToast('Status bio updated successfully', 'success');
  };

  const handleSaveName = async () => {
    onUpdateUser({ name: nameText });
    await updateProfile({ display_name: nameText });
    setIsEditingName(false);
    showToast('Display name updated', 'success');
  };

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      showToast('Browser notifications enabled!', 'success');
    } else if (perm === 'denied') {
      showToast('Notification permission was blocked in browser settings.', 'error');
    }
  };

  const handleResetPasswordClick = async () => {
    if (!currentUser.email) return;
    const res = await resetPassword(currentUser.email);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Password reset link sent to ${currentUser.email}`, 'info');
    }
  };

  const handleLogoutClick = async () => {
    await signOut();
    onLogout();
    showToast('Signed out of Alap', 'info');
  };

  return (
    <div className="w-full max-w-[640px] mx-auto px-5 pt-6 pb-24 md:pb-12 bg-slate-50 min-h-full flex flex-col">
      {/* Hidden File Input for Avatar */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileSelect}
      />

      {/* Page Heading */}
      <div className="flex items-center gap-2 mb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl italic text-indigo-700 leading-tight">
            Profile & Settings
          </h1>
          <p className="text-xs text-slate-500">Manage your account, preferences & security</p>
        </div>
      </div>

      {/* Profile Card */}
      <section className="flex flex-col items-center justify-center pt-6 pb-6 mb-6 bg-white rounded-3xl p-6 shadow-2xs border border-slate-200 text-center">
        <div className="relative mb-4">
          <Avatar
            src={currentUser.avatar}
            name={currentUser.name}
            size="xl"
            isOnline={true}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploadingAvatar}
            aria-label="Upload Profile Photo from Device"
            title="Upload photo from device"
            className="absolute bottom-0 right-0 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Name */}
        {isEditingName ? (
          <div className="flex items-center gap-2 mb-2 w-full max-w-xs">
            <input
              type="text"
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              className="bg-slate-50 border border-indigo-500 rounded-xl px-3 py-1.5 text-base font-semibold text-slate-900 text-center w-full focus:outline-hidden"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">
              {currentUser.name}
            </h2>
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        )}

        {/* Status / Bio */}
        {isEditingStatus ? (
          <div className="flex items-center gap-2 w-full max-w-xs mt-1">
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              className="bg-slate-50 border border-indigo-500 rounded-xl px-3 py-1 text-sm text-slate-700 text-center w-full focus:outline-hidden"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveStatus}
              className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingStatus(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors mt-1"
          >
            <span>{currentUser.statusText || 'Available'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        )}

        <span className="text-xs text-slate-400 mt-2 font-mono">{currentUser.email}</span>
      </section>

      {/* Settings Options List */}
      <section className="flex flex-col gap-3">
        {/* Desktop Notifications */}
        <button
          type="button"
          onClick={handleRequestNotifications}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900">Desktop Notifications</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : notificationPermission === 'denied'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {notificationPermission}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Get instant native alerts when receiving new messages
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>

        {/* Change / Reset Password */}
        <button
          type="button"
          onClick={handleResetPasswordClick}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-slate-900">Security & Password</h3>
              <p className="text-xs text-slate-500 truncate">
                Send password reset email link to your account
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>

        {/* Privacy & Encryption */}
        <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 text-left shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-slate-900">Privacy & Security</h3>
              <p className="text-xs text-slate-500 truncate">
                Direct messages & group messages are fully encrypted
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md shrink-0">
            Active
          </span>
        </div>
      </section>

      {/* Logout Action */}
      <div className="mt-8 pt-4 border-t border-slate-200 px-2">
        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-semibold text-sm cursor-pointer p-3 rounded-2xl transition-colors w-full justify-center border border-rose-100"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out of Alap</span>
        </button>
      </div>
    </div>
  );
};
