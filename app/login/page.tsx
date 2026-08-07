'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, resetPassword } from '@/lib/auth';
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

    const { data, error: signInError } = await signIn(signInData.email, signInData.password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else if (data?.user) {
      sendLoginNotification(data.user.id, signInData.email);
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
