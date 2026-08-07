'use client';
import Navbar from '@/components/Navbar';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Loader2, SmartphoneNfc, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['admin', 'super_admin', 'manager', 'support'];

type Step = 'password' | 'totp';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('password');

  // Password step
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TOTP step
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingSession, setPendingSession] = useState<any>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot password
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Already logged in → redirect
  useEffect(() => {
    if (authLoading) return;
    if (user && profile && ADMIN_ROLES.includes(profile.role as string)) {
      router.replace('/admin/dashboard');
    }
  }, [user, profile, authLoading, router]);

  // Auto-focus first TOTP digit when step changes
  useEffect(() => {
    if (step === 'totp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── Step 1: Password ──────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'team@microstay.us',
        password,
      });

      if (signInError) throw signInError;
      if (!data.user || !data.session) throw new Error('Sign-in failed');

      // Check if MFA is enabled for this user
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: mfaRow } = await serviceClient
        .from('user_mfa_secrets')
        .select('is_enabled')
        .eq('user_id', data.user.id)
        .eq('is_enabled', true)
        .maybeSingle();

      if (mfaRow?.is_enabled) {
        // MFA is on — hold the session, move to TOTP step
        // Sign out from Supabase client-side so the session cookie isn't set yet
        await supabase.auth.signOut();
        setPendingUserId(data.user.id);
        setPendingSession({ password }); // store password so we can re-authenticate after TOTP
        setStep('totp');
      } else {
        // No MFA — set cookie and go straight to dashboard
        const maxAge = data.session.expires_in ?? 3600;
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
        await fetch("/api/admin/login-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "team@microstay.us",
            userAgent: navigator.userAgent,
          }),
        });

        // // Send login notification
        // fetch('/api/admin/notify-login', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ email: 'team@microstay.us' })
        // }).catch(err => console.error('Notify login failed:', err));

        // Let onAuthStateChange drive the redirect (via useEffect above)
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: TOTP ──────────────────────────────────────────────────────────
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.replace(/\s/g, '');
    if (code.length !== 6) return;

    setTotpLoading(true);
    setTotpError('');

    try {
      // Verify the TOTP code against stored secret
      const res = await fetch('/api/admin/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId, token: code }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Invalid code');
      }

      // TOTP passed — re-authenticate to get a fresh session & cookie
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'team@microstay.us',
        password: pendingSession.password,
      });

      if (signInError || !data.session) throw new Error('Re-authentication failed. Please start over.');

      const maxAge = data.session.expires_in ?? 3600;
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      await fetch("/api/admin/login-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "team@microstay.us",
          userAgent: navigator.userAgent,
        }),
      });

      // Send login notification
      // fetch('/api/admin/notify-login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: 'team@microstay.us' })
      // }).catch(err => console.error('Notify login failed:', err));

      // onAuthStateChange will fire and the useEffect above will redirect
    } catch (err: any) {
      setTotpError(err.message || 'Verification failed.');
      setTotpCode('');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setTotpLoading(false);
    }
  };

  // Handle 6-box digit input
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const digits = totpCode.split('');
    digits[index] = value;
    const next = digits.join('').slice(0, 6);
    setTotpCode(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste (e.g. paste all 6 digits at once)
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setTotpCode(pasted);
      inputRefs.current[5]?.focus();
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    setResetting(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail('team@microstay.us', {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setResetting(false);
    }
  };

  // ── Reset sent screen ─────────────────────────────────────────────────────
  if (resetSent) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-sm border-orange-200 shadow-2xl text-center">
            <CardContent className="pt-10 pb-8 space-y-4">
              <div className="flex justify-center">
                <div className="bg-orange-100 p-4 rounded-full dark:bg-ms-orange">
                  <Shield className="h-10 w-10 text-orange-500 dark:text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-gray-500 text-sm">
                A password reset link has been sent to<br />
                <span className="font-mono font-medium text-gray-700">adminmotel@gmail.com</span>
              </p>
              <button
                onClick={() => setResetSent(false)}
                className="text-sm text-orange-600 hover:underline"
              >
                Back to login
              </button>
            </CardContent>
          </Card>
        </div>
      </>
    );

  }

  // ── TOTP screen ───────────────────────────────────────────────────────────
  if (step === 'totp') {
    const digits = totpCode.padEnd(6, '').split('');

    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-sm border-orange-200 shadow-2xl">
            <CardHeader className="text-center space-y-1">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
                  <SmartphoneNfc className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Two-Factor Auth</CardTitle>
              <CardDescription>
                Open Google Authenticator and enter the 6-digit code for <strong>MicroStay Admin</strong>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleTotpSubmit} className="space-y-5">
                {totpError && (
                  <Alert variant="destructive">
                    <AlertDescription>{totpError}</AlertDescription>
                  </Alert>
                )}

                {/* 6-box digit input */}
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit === ' ' ? '' : digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors bg-white"
                      style={{ borderColor: digit && digit !== ' ' ? '#f97316' : '' }}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={totpLoading || totpCode.replace(/\s/g, '').length !== 6}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-11 font-bold text-base"
                >
                  {totpLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</>
                    : 'Verify Code'
                  }
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('password');
                    setTotpCode('');
                    setTotpError('');
                    setPendingUserId('');
                    setPendingSession(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to password
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );

  }

  // ── Password screen ───────────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-400 via-gray-200 to-black/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-sm border-orange-200 shadow-2xl">
          <CardHeader className="text-center space-y-1">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
            <CardDescription>Enter your admin password to continue</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  placeholder="Admin password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10 h-11"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-11"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…</>
                  : 'Sign In'
                }
              </Button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="w-full text-sm text-gray-500 hover:text-orange-600 transition-colors disabled:opacity-50"
              >
                {resetting
                  ? <><Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Sending reset link…</>
                  : 'Forgot password?'
                }
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );

}
