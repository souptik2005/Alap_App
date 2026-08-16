import React, { useState } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { previewGroupByCode } from '../../lib/chatService';
import { useAuth } from '../../context/AuthContext';

interface JoinGroupModalProps {
  onBack: () => void;
  onJoinGroup: (code: string) => Promise<void>;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  onBack,
  onJoinGroup,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const [code, setCode] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previewData, setPreviewData] = useState<{
    conversationId: string;
    name: string;
    avatarUrl: string | null;
    memberCount: number;
    isMember: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(raw);
    setErrorMessage(null);
    setPreviewData(null);
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) {
      setErrorMessage('Please enter a valid 8-character access code.');
      return;
    }

    setIsPreviewing(true);
    setErrorMessage(null);
    try {
      const data = await previewGroupByCode(clean, currentUserId);
      setPreviewData(data);
    } catch (err: any) {
      setPreviewData(null);
      setErrorMessage(
        err?.message || 'Invalid or expired access code. Please check with an admin.'
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmJoin = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    setIsJoining(true);
    setErrorMessage(null);
    try {
      await onJoinGroup(clean);
    } catch (err: any) {
      console.error('Failed to join group:', err);
      setErrorMessage(err?.message || 'Could not join group. Please try again.');
      setIsJoining(false);
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
            disabled={isJoining || isPreviewing}
            className="flex items-center justify-center p-2 -ml-2 rounded-full text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Join Group with Code</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto max-w-[640px] w-full mx-auto p-4 pb-20 space-y-6">
        {/* Helper Banner */}
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 shadow-2xs">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-indigo-950">
              Instant Group Access
            </h3>
            <p className="text-xs text-indigo-800/80 mt-0.5 leading-relaxed">
              Enter the 8-character invite code provided by a group administrator to view group details and join the conversation.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Access Code Input Form */}
        <form onSubmit={handleLookup} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            8-Character Access Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="e.g. 7X9K2P4M"
                maxLength={8}
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isPreviewing || code.trim().length < 4}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isPreviewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Group Preview Card */}
        {previewData && (
          <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-4">
              <Avatar
                src={previewData.avatarUrl || undefined}
                name={previewData.name}
                size="xl"
                className="border-2 border-indigo-100 shadow-2xs shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Users className="w-3 h-3" /> Group Found
                </span>
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {previewData.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{previewData.memberCount} members currently</span>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              {previewData.isMember ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>You are already an active member of this group.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    disabled={isJoining}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Conversation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmJoin}
                  disabled={isJoining}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining group...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Join Group Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
