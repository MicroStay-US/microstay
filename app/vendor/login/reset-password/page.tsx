'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Password rules ────────────────────────────────────────────────────────────
const RULES = [
  { id: 'length',  label: 'At least 10 characters',       test: (p: string) => p.length >= 10 },
  { id: 'upper',   label: 'At least 1 uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit',   label: 'At least 1 number',            test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordRule({ passes, label }: { passes: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${passes ? 'text-emerald-600' : 'text-gray-400'}`}>
      {passes
        ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
        : <XCircle className="w-4 h-4 shrink-0 text-gray-300" />}
      {label}
    </li>
  );
}

function VendorResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1: exchange the token_hash from the email link ───────────────────
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'recovery' | null;

    if (!tokenHash || type !== 'recovery') {
      setVerifyError('Invalid or missing reset link. Please request a new one.');
      setVerifying(false);
      return;
    }

    Promise.race([
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      ),
    ])
      .then(({ error }: any) => {
        if (error) {
          setVerifyError('This reset link has expired or already been used. Please request a new one.');
        }
      })
      .catch(() => {
        setVerifyError('Could not verify the reset link. Please check your connection and request a new one.');
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [searchParams]);

  // ── Validation ────────────────────────────────────────────────────────────
  const ruleResults = RULES.map(r => ({ ...r, passes: r.test(password) }));
  const allRulesPassed = ruleResults.every(r => r.passes);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && !loading;

  // ── Step 2: set the new password ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      // Confirm the session is still alive before calling updateUser
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session has expired. Please request a new password reset email and try again.');
      }

      // Race against a 20-second timeout so the button never hangs forever
      const { error: updateError } = await Promise.race([
        supabase.auth.updateUser({ password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 20000)
        ),
      ]);

      if (updateError) throw new Error(updateError.message || 'Failed to update password.');

      // Clear the session so the vendor must log in fresh
      await supabase.auth.signOut().catch(() => {/* ignore signOut errors */});
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      // ALWAYS unblock the button — no more infinite spinner
      setLoading(false);
    }
  };

  // ── Loading state while verifying token ───────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E1A16 0%, #FF5E1A 60%, #F0997B 100%)' }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ────────────────────────────────────────────────
  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #2E1A16 0%, #FF5E1A 60%, #F0997B 100%)' }}>
        <Card className="w-full max-w-md shadow-2xl bg-white/95">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Link Expired</h2>
            <p className="text-gray-500 text-sm">{verifyError}</p>
            <Button
              className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white"
              onClick={() => router.push('/vendor/login')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #2E1A16 0%, #FF5E1A 60%, #F0997B 100%)' }}>
        <Card className="w-full max-w-md shadow-2xl bg-white/95">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Password Updated!</h2>
            <p className="text-gray-500 text-sm">
              Your password has been changed successfully. Please sign in with your new password.
            </p>
            <Button
              className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold"
              onClick={() => router.push('/vendor/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main reset form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #2E1A16 0%, #FF5E1A 60%, #F0997B 100%)' }}>
      <Card className="w-full max-w-md border-ms-orange-border/30 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-ms-orange to-ms-orange-border p-4 rounded-xl shadow-lg border border-ms-orange-border">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-ms-text">Set New Password</CardTitle>
          <CardDescription className="text-ms-text-muted">
            Choose a strong password for your Vendor Portal account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-ms-text">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-ms-orange-light border-ms-orange-border/40 focus:ring-ms-orange focus:border-ms-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ms-text-muted hover:text-ms-text transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password strength rules */}
            {password.length > 0 && (
              <ul className="space-y-1.5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                {ruleResults.map(r => (
                  <PasswordRule key={r.id} passes={r.passes} label={r.label} />
                ))}
              </ul>
            )}

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirm" className="font-semibold text-ms-text">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className={`pr-10 bg-ms-orange-light border-ms-orange-border/40 focus:ring-ms-orange focus:border-ms-orange ${
                    confirm.length > 0 && !passwordsMatch ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ms-text-muted hover:text-ms-text transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-red-500 text-xs font-medium">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-ms-orange hover:bg-ms-orange-hover text-white shadow-lg font-bold py-6 text-lg mt-2 disabled:opacity-50"
            >
              {loading ? 'Updating Password…' : 'Set New Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VendorResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E1A16 0%, #FF5E1A 60%, #F0997B 100%)' }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Loading…</p>
        </div>
      </div>
    }>
      <VendorResetPasswordInner />
    </Suspense>
  );
}
