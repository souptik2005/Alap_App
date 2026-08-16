import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSuccess: () => void;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onNavigateToSignup,
  onNavigateToForgotPassword,
}) => {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-200"
    >
      <div className="text-center mb-6">
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.9)]">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="font-display text-3xl italic text-indigo-700 leading-none">
            Alap
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">Welcome back to your casual hangout</p>
      </div>

      {!isConfigured && (
        <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Supabase credentials required</p>
            <p className="text-amber-700/90 leading-relaxed text-[11.5px]">
              Set <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in environment variables.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
            <input
              type="checkbox"
              defaultChecked
              className="rounded-md text-indigo-600 focus:ring-indigo-500"
            />
            Remember me
          </label>
          {onNavigateToForgotPassword && (
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={isLoading}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm shadow-[0_10px_20px_-8px_rgba(79,70,229,0.8)] hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 mt-2"
        >
          <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
        Don't have an Alap account yet?{' '}
        <button
          type="button"
          onClick={onNavigateToSignup}
          className="text-indigo-600 font-bold hover:underline cursor-pointer"
        >
          Create Account
        </button>
      </div>
    </motion.div>
  );
};
