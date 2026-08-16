import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    username: string
  ) => Promise<{ error?: string; needEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateProfile: (updatedData: Partial<Profile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  // Helper to fetch/create profile
  const fetchProfile = async (authUser: User) => {
    if (!configured) return;
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // If there is a transient clock-skew error (e.g. "JWT issued at future" / "JWT issued in the future")
      if (
        error &&
        (error.message?.toLowerCase().includes('future') ||
          error.message?.toLowerCase().includes('jwt') ||
          error.code === 'PGRST301')
      ) {
        // Wait 600ms to allow client-server timestamp alignment and retry once
        await new Promise((resolve) => setTimeout(resolve, 600));
        const retryResult = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.warn('Supabase profile query warning:', error.message);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      } else {
        // Create initial profile if missing in database (only when no error occurred)
        const defaultUsername =
          authUser.user_metadata?.username ||
          authUser.email?.split('@')[0] ||
          `user_${authUser.id.slice(0, 5)}`;
        const defaultDisplayName =
          authUser.user_metadata?.display_name ||
          defaultUsername;

        const newProfile = {
          id: authUser.id,
          username: defaultUsername,
          display_name: defaultDisplayName,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${authUser.id}`,
          bio: 'Available',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdData, error: upsertError } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single();

        if (!upsertError && createdData) {
          setProfile(createdData as Profile);
        } else {
          setProfile(newProfile as unknown as Profile);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Listen for auth state changes (onAuthStateChange fires INITIAL_SESSION on mount in supabase-js v2)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        window.history.pushState({}, '', '/update-password');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }

      if (currentSession?.user) {
        await fetchProfile(currentSession.user);
      } else {
        setProfile(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    username: string
  ) => {
    if (!configured) {
      return {
        error:
          'Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to environment secrets.',
      };
    }

    try {
      const cleanUsername = username.trim().toLowerCase() || email.split('@')[0];
      const cleanDisplayName = displayName.trim() || cleanUsername;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: cleanDisplayName,
            username: cleanUsername,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Create initial profile in profiles table
        const profilePayload = {
          id: data.user.id,
          username: cleanUsername,
          display_name: cleanDisplayName,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.id}`,
          bio: 'Available',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(profilePayload);

        if (profileErr) {
          console.warn('Profile insertion warning:', profileErr.message);
        }

        // Check if email confirmation is required
        if (data.session === null && !data.user.confirmed_at) {
          return { needEmailConfirmation: true };
        }
      }

      return {};
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err.message : 'Sign up failed unexpectedly',
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      return {
        error:
          'Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to environment secrets.',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err.message : 'Sign in failed unexpectedly',
      };
    }
  };

  const signOut = async () => {
    if (!configured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!configured) {
      return {
        error:
          'Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to environment secrets.',
      };
    }

    try {
      // Direct user back to /update-password
      const origin = window.location.origin;
      const redirectTo = `${origin}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err.message : 'Password reset failed unexpectedly',
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!configured) {
      return {
        error: 'Supabase credentials are not configured.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err.message : 'Password update failed unexpectedly',
      };
    }
  };

  const updateProfile = async (updatedData: Partial<Profile>) => {
    if (!user) return { error: 'No authenticated user' };

    try {
      const payload = {
        ...updatedData,
        updated_at: new Date().toISOString(),
      };

      if (configured) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (error) {
          return { error: error.message };
        }
      }

      setProfile((prev) => (prev ? { ...prev, ...payload } : null));
      return {};
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update profile unexpectedly',
      };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: configured,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
