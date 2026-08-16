import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, MessageSquare, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordFormProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onNavigateToLogin,
}) => {
  const { resetPassword, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-md border border-slate-200">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <MessageSquare className="w-8 h-8 fill-indigo-600 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
        <p className="text-xs text-slate-500 mt-1">
          Enter your registered email and we'll send you a link to reset your password.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Supabase credentials required</p>
            <p className="text-amber-700/90 leading-relaxed">
              Please set <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in environment secrets to send real password reset emails.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-5">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Check your inbox</p>
              <p className="mt-1 leading-relaxed text-emerald-700">
                We've sent a password reset link to <strong className="text-emerald-900">{email}</strong>. Follow the instructions in the email to set a new password.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Didn't receive the email? Check your spam folder or try again.
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSubmitted(false)}
              className="w-full py-2.5 text-xs font-semibold"
            >
              Try another email
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onNavigateToLogin}
              className="w-full py-2.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-100 text-slate-800 text-sm rounded-lg py-2.5 pl-10 pr-4 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                placeholder="you@example.com"
                autoFocus
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
                Sending Reset Link...
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
