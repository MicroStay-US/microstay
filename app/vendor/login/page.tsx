'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Eye, EyeOff } from 'lucide-react';
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Intercept failed logins to check if they are actually in the application queue
        const statusRes = await fetch('/api/vendor/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const { status } = await statusRes.json();

        if (status === 'pending') {
          throw new Error('Your application is currently under review. Please wait 24-48 hours.');
        } else if (status === 'rejected') {
          throw new Error('Your application was not approved. Please contact support@microstay.us');
        } else {
          throw signInError;
        }
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed');
      }

      // Set cookie for middleware, then full-page navigate.
      // Role enforcement is handled by the vendor layout (uses profileLoaded).
      const maxAge = data.session.expires_in ?? 3600;
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      sendLoginNotification(data.user.id, email);
      // Use router.push (soft nav) so AuthProvider's onAuthStateChange(SIGNED_IN)
      // fires with the live in-memory session — avoids full-page reload race condition.
      router.push('/vendor/dashboard');
    } catch (err: any) {
      setError(err.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
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
            Vendor Portal
          </CardTitle>
          <CardDescription className="text-ms-text-muted font-medium">
            Manage your MicroStay properties, bookings, and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
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
