'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Eye, EyeOff, Loader2, SmartphoneNfc, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendLoginNotification } from '@/lib/login-notification';
import Navbar from '@/components/Navbar';

export default function VendorLoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // OTP State
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'vendor') {
        router.push('/vendor/dashboard');
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vendor/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Login failed.');
      }
      if (result.bypassed) {
        // Vendor hasn't completed onboarding — bypass OTP entirely
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });

        if (sessionErr) throw new Error('Session setup failed.');

        const maxAge = 3600;
        document.cookie = `sb-access-token=${result.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

        // The useEffect will catch the auth state change and route to dashboard
        window.location.reload();
        return;
      }

      setStep('otp');
      if (result.dev_code) {
        setOtpCode(result.dev_code);
        // Print it to browser console just in case
        console.log('DEV MODE OTP CODE:', result.dev_code);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.replace(/\s/g, '');
    if (code.length !== 6) return;

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/api/vendor/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Invalid code');
      }

      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionErr) throw new Error('Session setup failed.');

      const maxAge = 3600;
      document.cookie = `sb-access-token=${result.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      // Send login notification and wait for it
      await sendLoginNotification(result.user?.id || 'unknown', email);
      router.push('/vendor/dashboard');
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed.');
      setOtpCode('');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const val = value.replace(/[^0-9]/g, '').slice(-1);
    const digits = otpCode.padEnd(6, ' ').split('');
    digits[index] = val || ' ';
    const next = digits.join('').slice(0, 6);
    setOtpCode(next);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    const isEmpty = !otpCode[index] || otpCode[index] === ' ';
    if (e.key === 'Backspace' && isEmpty && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted);
      inputRefs.current[5]?.focus();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Apikey': supabaseAnonKey || '',
        },
        body: JSON.stringify({
          email: forgotEmail,
          redirectTo: window.location.origin + '/vendor/login',
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setForgotError(result.error || 'Failed to send reset email');
      } else {
        setForgotSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email');
    }

    setForgotLoading(false);
  };

  return (
     <>
      <Navbar />
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-ms-orange via-white to-ms-teal dark:bg-gradient-to-br dark:from-ms-orange dark:to-ms-teal">
      
      <Card className="w-full max-w-md border-ms-orange-border/30 shadow-2xl bg-white/95 backdrop-blur-sm dark:bg-black">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-ms-orange to-ms-orange-border p-4 rounded-xl shadow-lg border border-ms-orange-border">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-ms-orange to-ms-text">
            {step === 'otp' ? 'Check your email' : 'Vendor Portal'}
          </CardTitle>
          <CardDescription className="text-ms-text-muted font-medium">
            {step === 'otp' 
              ? 'Enter the 6-digit OTP code sent to your email.'
              : 'Manage your MicroStay properties, bookings, and revenue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'otp' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              {otpError && (
                <Alert variant="destructive">
                  <AlertDescription>{otpError}</AlertDescription>
                </Alert>
              )}

              {/* 6-box digit input */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otpCode.padEnd(6, ' ').split('').map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit === ' ' ? '' : digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-ms-orange focus:ring-2 focus:ring-ms-orange/20 transition-colors bg-white dark:bg-gray-800 dark:text-white"
                    style={{ borderColor: digit && digit !== ' ' ? '#FF5E1A' : '' }}
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={otpLoading || otpCode.replace(/\s/g, '').length !== 6}
                className="w-full bg-gradient-to-r from-ms-orange to-ms-orange-hover hover:from-ms-orange-hover hover:to-ms-orange h-12 font-bold text-lg text-white shadow-lg"
              >
                {otpLoading
                  ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying…</>
                  : 'Verify Code'
                }
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('password');
                  setOtpCode('');
                  setOtpError('');
                }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-ms-text-muted hover:text-ms-orange transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to login
              </button>
            </form>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotError && (
                <Alert variant="destructive">
                  <AlertDescription>{forgotError}</AlertDescription>
                </Alert>
              )}
              {forgotSuccess && (
                <Alert className="bg-ms-teal-light border-ms-teal-border dark:bg-green-600 dark:border-transparent">
                  <AlertDescription className="text-ms-teal dark:text-white">{forgotSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="manager@motel.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white shadow-md font-semibold"
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="text-sm text-ms-orange hover:text-ms-text hover:underline font-medium transition-colors dark:hover:text-ms-orange-light"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-ms-text dark:text-white">Account Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@motel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-ms-orange-light border-ms-orange-border/40 focus:ring-ms-orange focus:border-ms-orange dark:focus:border-transparent dark:bg-transparent"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="font-semibold text-ms-text dark:text-white">Password</Label>
                    <button
                    type="button"
                    onClick={() => {
                        setShowForgotPassword(true);
                        setForgotEmail(email);
                    }}
                    className="text-sm text-ms-orange hover:text-ms-text hover:underline font-medium transition-colors dark:hover:text-ms-orange-light"
                    >
                    Forgot Password?
                    </button>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your dashboard password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-ms-orange-light border-ms-orange-border/40 focus:ring-ms-orange focus:border-ms-orange dark:focus:border-transparent dark:bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ms-text-muted hover:text-ms-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white shadow-lg font-bold py-6 text-lg mt-2 hover:scale-105 active:scale-95"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-ms-orange-border/20 text-center">
            <p className="text-ms-text-muted mb-4 font-medium text-sm">Not a partner yet?</p>
            <Button
                variant="outline"
                className="w-full border-ms-orange-border text-ms-orange hover:bg-ms-orange-light font-semibold dark:hover:bg-ms-orange dark:hover:border-transparent active:scale-95"
                onClick={() => router.push('/partner-signup')}
            >
                Submit Partner Application
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
