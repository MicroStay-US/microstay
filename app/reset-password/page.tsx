'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Shield, Loader as Loader2 } from 'lucide-react';

function PasswordStrengthGuide({ password }: { password: string }) {
  const rules = [
    { label: 'At least 10 characters', met: password.length >= 10 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className='bg-orange-50 border border-orange-100 rounded-lg p-3 mt-2'>
      <p className='text-xs font-semibold text-orange-800 mb-2'>Password must contain:</p>
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

type Step = 'verifying' | 'mfa' | 'password' | 'expired';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('verifying');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // MFA state
  const [mfaToken, setMfaToken] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      try {
        // Handle token_hash style (newer Supabase)
        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) throw verifyError;
          await checkMfaAndProceed();
          return;
        }

        // Handle legacy hash fragment style
        const hashFragment = typeof window !== 'undefined' ? window.location.hash : '';
        if (hashFragment.includes('access_token')) {
          const params = new URLSearchParams(hashFragment.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            await checkMfaAndProceed();
            return;
          }
        }

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await checkMfaAndProceed();
          return;
        }

        // Listen for PASSWORD_RECOVERY event
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
          if (event === 'PASSWORD_RECOVERY') {
            await checkMfaAndProceed();
          }
        });
        setTimeout(() => {
          setStep('expired');
          authListener.subscription.unsubscribe();
        }, 4000);
      } catch {
        setError('This reset link has expired or is invalid. Please request a new one.');
        setStep('expired');
      }
    };

    verifyToken();
  }, [searchParams]);

  const checkMfaAndProceed = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      setStep('password');
      return;
    }

    if (data.currentLevel === 'aal2') {
      // Already AAL2, go straight to password form
      setStep('password');
    } else if (data.nextLevel === 'aal2') {
      // MFA enrolled but not yet verified — need TOTP
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = (factors?.totp || []).find((f: any) => f.status === 'verified');
      if (verified) {
        const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: verified.id });
        if (challengeErr) {
          setStep('password'); // fallback
          return;
        }
        setMfaFactorId(verified.id);
        setMfaChallengeId(challenge.id);
        setStep('mfa');
      } else {
        setStep('password');
      }
    } else {
      setStep('password');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaToken,
      });
      if (verifyErr) throw verifyErr;
      setStep('password');
    } catch (err: any) {
      setMfaError(err.message || 'Invalid code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 10) return 'Password must be at least 10 characters long';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const passwordError = validatePassword(password);
      if (passwordError) { setError(passwordError); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess('Password reset successful! Redirecting...');
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
          if (profileData?.role === 'admin') router.push('/admin/dashboard');
          else if (profileData?.role === 'vendor') router.push('/vendor/dashboard');
          else router.push('/');
        } else {
          router.push('/admin/login');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-orange-200 shadow-2xl">{children}</Card>
    </div>
  );

  if (step === 'verifying') return wrapper(
    <CardContent className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-4" />
      <p className="text-gray-600">Verifying your reset link...</p>
    </CardContent>
  );

  if (step === 'expired') return wrapper(
    <>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error || 'This link has expired or is invalid. Please request a new password reset.'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/login')}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          Back to Login
        </Button>
      </CardContent>
    </>
  );

  if (step === 'mfa') return wrapper(
    <>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Two-Factor Verification</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleMfaVerify} className="space-y-4">
          {mfaError && <Alert variant="destructive"><AlertDescription>{mfaError}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="000000"
              value={mfaToken}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setMfaToken(val);
                if (val.length === 6) {
                  setTimeout(() => {
                    const form = e.target.closest('form');
                    if (form) form.requestSubmit();
                  }, 100);
                }
              }}
              maxLength={6}
              inputMode="numeric"
              required
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>
          <Button type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            disabled={mfaLoading || mfaToken.length !== 6}>
            {mfaLoading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>
      </CardContent>
    </>
  );

  return wrapper(
    <>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert className="bg-green-50 border-green-200"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 10 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthGuide password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
