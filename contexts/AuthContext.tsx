'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;       // true once fetchProfile has completed (even if null)
  profileFetchFailed: boolean;  // true if all retry attempts failed (network/timeout/DB)
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileLoaded: false,
  profileFetchFailed: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileFetchFailed, setProfileFetchFailed] = useState(false);

  // Retries up to 3 times with exponential back-off before giving up.
  // Uses a server-side API route with service role key — bypasses all RLS issues.
  // Sets profileFetchFailed=true on total failure so layouts can show a retry UI.
  //
  // IMPORTANT (2026-04-10 deadlock fix): when this is called from inside an
  // onAuthStateChange listener, do NOT call supabase.auth.getSession() because
  // that method tries to re-acquire the same auth lock that the outer
  // signInWithPassword/updateUser/signOut call is still holding. Instead, pass
  // the access token explicitly via `knownToken`. The listener already has the
  // session in scope as the second argument to onAuthStateChange, so this is
  // trivial and avoids a full Supabase-JS lock deadlock that hung the
  // admin login and password reset flows.
  const fetchProfile = async (userId: string, knownToken?: string): Promise<void> => {
    setProfileFetchFailed(false);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let token = knownToken;
        if (!token) {
          // Only called from the initial getSession() path below — safe because
          // we're not inside an active auth lock at that point.
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token;
        }

        if (!token) throw new Error('no-session');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const { profile: data } = await res.json();

        // Success
        setProfile(data as Profile | null);
        setProfileFetchFailed(false);
        setProfileLoaded(true);
        return;
      } catch (err: any) {
        console.warn(`[fetchProfile] attempt ${attempt} failed:`, err?.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          // All 3 attempts failed — mark failure but keep user session alive
          setProfile(null);
          setProfileFetchFailed(true);
          setProfileLoaded(true);
        }
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setProfileLoaded(false);
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session) {
        // Keep cookie in sync for server-side API routes (middleware uses sb-access-token)
        const maxAge = session.expires_in ?? 604800;
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;
        await fetchProfile(session.user.id);
      } else {
        document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Strict; Secure';
        setProfile(null);
        setProfileLoaded(true);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        // Only signal "loading" for meaningful auth transitions (sign-in / sign-out).
        // TOKEN_REFRESHED is a silent background event — setting loading=true for it
        // causes the dashboard spinner to flash on every token refresh.
        const isTransition = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED';
        if (isTransition) setLoading(true);
        setUser(session?.user ?? null);
        if (session) {
          const maxAge = session.expires_in ?? 3600;
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
          if (event !== 'TOKEN_REFRESHED') {
            // CRITICAL: do NOT await fetchProfile here. The outer auth call
            // (signInWithPassword / updateUser / signOut) is still holding
            // the Supabase auth lock, and awaiting listener work blocks that
            // call from ever resolving. Instead, kick off fetchProfile without
            // awaiting and pass the already-known access token so fetchProfile
            // never has to call getSession (which would also try to acquire
            // the lock).
            void fetchProfile(session.user.id, session.access_token).finally(() => {
              if (mounted) setLoading(false);
            });
            return;
          }
          // TOKEN_REFRESHED path: cookie is already updated above, nothing else to do.
        } else {
          document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Strict; Secure';
          setProfile(null);
          setProfileFetchFailed(false);
          setProfileLoaded(true);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Strict; Secure';
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileLoaded(false);
    setProfileFetchFailed(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoaded, profileFetchFailed, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
