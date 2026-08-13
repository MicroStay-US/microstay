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
import { resetPassword } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['admin', 'super_admin', 'manager', 'support'];

type Step = 'password' | 'otp';

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

  // Auto-focus first OTP digit when step changes
  useEffect(() => {
    if (step === 'otp') {
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
      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'adminmotel@gmail.com', password }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Login failed.');
      }

      if (result.dev_code) {
        setTotpCode(result.dev_code);
        // Print it to browser console just in case
        console.log('DEV MODE OTP CODE:', result.dev_code);
      }

      setPendingSession({ password }); // store password so we can verify OTP
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP ──────────────────────────────────────────────────────────
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.replace(/\s/g, '');
    if (code.length !== 6) return;

    setTotpLoading(true);
    setTotpError('');

    try {
      // Verify the OTP code
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password: pendingSession.password }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Invalid code');
      }

      // OTP passed — set session manually
      const { data, error: sessionErr } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      
      if (sessionErr) throw new Error('Session setup failed.');

      // Also set the cookie manually as fallback for middleware
      const maxAge = 3600;
      document.cookie = `sb-access-token=${result.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      await fetch("/api/admin/login-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "adminmotel@gmail.com",
          userAgent: navigator.userAgent,
        }),
      });

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
    const val = value.replace(/[^0-9]/g, '').slice(-1);
    const digits = totpCode.padEnd(6, ' ').split('');
    digits[index] = val || ' ';
    const next = digits.join('').slice(0, 6);
    setTotpCode(next);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    const isEmpty = !totpCode[index] || totpCode[index] === ' ';
    if (e.key === 'Backspace' && isEmpty && index > 0) {
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
      const targetEmail = 'adminmotel@gmail.com';
      const result = await resetPassword(targetEmail);
      if (!result.success) throw new Error(result.error);
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
        <div className="min-h-screen bg-orange-200/40 dark:bg-transparent flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-sm border-orange-200 dark:border-transparent shadow-2xl text-center">
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

  // ── OTP screen ───────────────────────────────────────────────────────────
  if (step === 'otp') {
    const digits = totpCode.padEnd(6, ' ').split('');

    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-orange-300/40 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-sm border-orange-200 shadow-2xl">
            <CardHeader className="text-center space-y-1">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
                  <SmartphoneNfc className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>
                Enter the 6-digit OTP code sent to your email for <strong>MicroStay Admin</strong>
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
      <div className="min-h-screen bg-orange-300/40 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-sm border-orange-200 dark:border-transparent shadow-2xl">
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
