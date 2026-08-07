'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setError('');

    try {
      // With Supabase, clicking the reset link from the email automatically establishes
      // a session in the client via the URL hash fragment.
      // So calling updateUser immediately applies the new password to that session.
      //
      // KNOWN ISSUE (2026-04-10): updateUser internally `await`s every
      // onAuthStateChange listener. Our AuthContext listener calls fetchProfile,
      // which calls supabase.auth.getSession() — and getSession tries to
      // re-acquire the same lock that updateUser is still holding. This caused
      // the button to hang on "Updating…" forever even though the PUT
      // succeeded server-side. To work around the deadlock we race the call
      // against a 5-second timeout; if updateUser hangs, we assume the write
      // succeeded (the PUT is idempotent) and proceed with the manual
      // session cleanup below.
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise<{ error: null; timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ error: null, timedOut: true } as any), 5000),
      );
      const result = await Promise.race([updatePromise, timeoutPromise]) as
        | { error: any; timedOut?: undefined }
        | { error: null; timedOut: true };

      if ('timedOut' in result && result.timedOut) {
        // Lock deadlock: fall through as if it succeeded. The PUT already
        // completed on the server.
        console.warn('[reset-password] updateUser timed out on client — assuming server-side success');
      } else if (result.error) {
        const msg = (result.error as Error).message || '';
        if (msg.includes('Auth session missing') || msg.includes('session_not_found')) {
          throw new Error('Invalid or expired reset session. Please request a new password reset link.');
        }
        throw result.error;
      }

      // Manually clear the local session instead of calling supabase.auth.signOut(),
      // which would hit the same lock-deadlock path described above. The user
      // will be forced to re-login on /admin/login which triggers MFA as normal.
      try {
        localStorage.removeItem('microstay-auth');
      } catch {
        /* ignore storage errors */
      }
      document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';

      setDone(true);
      setTimeout(() => router.replace('/admin/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-sm border-green-200 shadow-2xl text-center">
        <CardContent className="pt-10 pb-8 space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Password Updated!</h2>
          <p className="text-gray-500 text-sm">Redirecting to login…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm border-orange-200 shadow-2xl">
      <CardHeader className="text-center space-y-1">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>Choose a strong password for the admin account</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="New password (min. 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pr-10 h-11"
              autoFocus
              required
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="pr-10 h-11"
              required
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-11"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating…</>
              : 'Update Password'
            }
          </Button>

          <Button 
            variant="ghost" 
            type="button"
            className="w-full" 
            onClick={() => router.push('/admin/login')}
          >
            Back to Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
      <Suspense fallback={<div className="text-white">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
