import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, CheckCircle2, MessageSquare, AlertCircle, Loader2, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

interface ResetPasswordFormProps {
  onSuccess: () => void;
  onNavigateToLogin?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onNavigateToLogin,
}) => {
  const { updatePassword, session, user, isConfigured } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Check URL query parameters and hash fragments for Supabase auth errors (e.g. otp_expired, access_denied)
  useEffect(() => {
    try {
      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(search);

      const errorParam = hashParams.get('error') || searchParams.get('error');
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription =
        hashParams.get('error_description') || searchParams.get('error_description');

      if (errorParam || errorCode || errorDescription) {
        let msg = 'The password reset link is invalid or has expired.';
        if (errorCode === 'otp_expired') {
          msg = 'This password reset link has expired. Please request a new one.';
        } else if (errorDescription) {
          msg = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
        }
        setUrlError(msg);
      }
    } catch (e) {
      console.error('Error parsing recovery params:', e);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsSuccess(true);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-md border border-slate-200">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <MessageSquare className="w-8 h-8 fill-indigo-600 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Update Password</h1>
        <p className="text-xs text-slate-500 mt-1">
          Enter your new password below to regain access to your account.
        </p>
      </div>

      {urlError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-0.5">Reset Link Expired or Invalid</p>
              <p className="text-amber-700 leading-relaxed">{urlError}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/forgot-password');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request New Link
            </button>
            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="py-2 px-3 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      )}

      {error && !urlError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4 text-center">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
            <h3 className="font-semibold text-emerald-900 text-sm">Password Reset Successful!</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Your password has been changed successfully. Please log in with your new credentials.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={onSuccess}
            className="w-full py-3 text-sm font-semibold shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Proceed to Login
          </Button>
        </div>
      ) : !urlError ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-100 text-slate-800 text-sm rounded-lg py-2.5 pl-10 pr-4 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-100 text-slate-800 text-sm rounded-lg py-2.5 pl-10 pr-4 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-sm mt-2 font-semibold shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              <>
                Update Password
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-xs text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Cancel and return to Login
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};
