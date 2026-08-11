'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, resetPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { sendLoginNotification } from '@/lib/login-notification';

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrengthGuide({ password }: PasswordStrengthProps) {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(password) },
  ];
  return (
    <div className='bg-ms-orange-light border border-ms-orange-border rounded-lg p-3 mt-2 dark:bg-black/70 dark:border-transparent'>
      <p className='text-xs font-semibold text-ms-orange mb-2'>Password must contain:</p>
      {rules.map((rule, i) => (
        <div key={i} className='flex items-center gap-2 text-xs mb-1'>
          <span className={rule.met ? 'text-green-600' : 'text-gray-400'}>
            {rule.met ? '✓' : '○'}
          </span>
          <span className={rule.met ? 'text-green-700 font-medium' : 'text-gray-500'}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [otpCode, setOtpCode] = useState('');
  
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.requires_password_reset) {
        router.push('/set-password');
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (profile.role === 'vendor') {
        router.push('/vendor/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInData.email, password: signInData.password }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        setError(result.error || 'Failed to send OTP.');
        setLoading(false);
        return;
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
        setOtpCode(result.dev_code.padEnd(6, ' '));
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const code = otpCode.replace(/\s/g, '');
    if (code.length !== 6) return;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInData.email, password: signInData.password, code }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        setError(result.error || 'Invalid or expired code.');
        setLoading(false);
        return;
      }

      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionErr) throw new Error('Session setup failed.');

      const maxAge = 3600;
      document.cookie = `sb-access-token=${result.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      // Send login notification and wait for it
      await sendLoginNotification(result.user?.id || 'unknown', signInData.email);

      // The useEffect at the top of the file will now detect the auth state change and route them appropriately
      window.location.reload();
    } catch (err: any) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (signUpData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(signUpData.password)) {
      setError('Password needs an uppercase letter');
      setLoading(false);
      return;
    }
    if (!/[0-9]/.test(signUpData.password)) {
      setError('Password needs a number');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await signUp(
      signUpData.email,
      signUpData.password,
      signUpData.name,
      signUpData.phone
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess('Account created successfully! Please check your email to verify.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    const result = await resetPassword(forgotEmail);

    if (!result.success) {
      setForgotError(result.error || 'Failed to send reset email');
    } else {
      setForgotSuccess('Password reset email sent! Check your inbox.');
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen  bg-gradient-to-b from-amber-100 via-orange-200 to-amber-100 dark:bg-gradient-to-b dark:from-black dark:via-ms-orange dark:to-black flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-transparent shadow-xl dark:border-transparent bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-gray-900">Welcome to MicroStay</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotError && (
                    <Alert variant="destructive">
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}
                  {forgotSuccess && (
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-600 dark:border-green-600">
                      <AlertDescription className="text-green-800 dark:text-white">{forgotSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white"
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
                      className="text-sm text-ms-orange hover:text-ms-orange-hover hover:underline font-medium transition-colors"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : step === 'otp' ? (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-ms-orange text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                    <p className="text-gray-500">
                      Enter the 6-digit OTP code sent to your email.
                    </p>
                  </div>

                  <div className="flex justify-center gap-2 mb-8">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 focus:border-ms-orange focus:ring-ms-orange transition-all duration-200"
                        value={otpCode[index] !== ' ' ? (otpCode[index] || '') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(-1);
                          
                          const newCode = otpCode.split('');
                          newCode[index] = val || ' ';
                          while (newCode.length < 6) newCode.push(' ');
                          setOtpCode(newCode.slice(0, 6).join(''));
                          
                          if (val && index < 5) {
                            const next = document.getElementById(`otp-${index + 1}`);
                            next?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            const isEmpty = !otpCode[index] || otpCode[index] === ' ';
                            if (isEmpty && index > 0) {
                              const prev = document.getElementById(`otp-${index - 1}`);
                              prev?.focus();
                            } else {
                              const newCode = otpCode.split('');
                              newCode[index] = ' ';
                              setOtpCode(newCode.join(''));
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                          if (pasted) {
                            setOtpCode(pasted.padEnd(6, ' '));
                            const focusIndex = Math.min(5, pasted.length);
                            document.getElementById(`otp-${focusIndex === 6 ? 5 : focusIndex}`)?.focus();
                          }
                        }}
                      />
                    ))}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold bg-ms-orange hover:bg-ms-orange-hover text-white rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02]" 
                    disabled={loading || otpCode.replace(/\s/g, '').length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('password');
                        setOtpCode('');
                        setError('');
                      }}
                      className="text-sm text-gray-500 hover:text-ms-orange transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInData.email}
                      onChange={(e) =>
                        setSignInData({ ...signInData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        value={signInData.password}
                        onChange={(e) =>
                          setSignInData({ ...signInData, password: e.target.value })
                        }
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setForgotEmail(signInData.email);
                      }}
                      className="text-sm text-ms-orange hover:text-ms-orange-hover hover:underline font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-ms-orange to-ms-orange hover:from-ms-orange-hover hover:to-ms-orange-hover text-white" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpData.name}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpData.email}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={signUpData.phone}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, password: e.target.value })
                      }
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthGuide password={signUpData.password} />
                </div>

                <Button type="submit" className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
