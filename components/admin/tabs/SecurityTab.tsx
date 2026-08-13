'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, LockKeyhole, Shield, User, Mail, Key } from 'lucide-react';
import { safeFetch } from '@/lib/api';
import { useRBAC } from '@/contexts/RBACContext';

export function SecurityTab() {
  const { user } = useAuth();
  const { role, roleLabel, roleColor } = useRBAC();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const [setupStep, setSetupStep] = useState<'idle' | 'verify'>('idle');
  const [setupSecret, setSetupSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, [user]);

  const checkMfaStatus = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('user_mfa_secrets').select('is_enabled').eq('user_id', user.id).maybeSingle();
    setMfaEnabled(data?.is_enabled || false);
    setLoading(false);
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    };
  };

  const startMfaSetup = async () => {
    setError('');
    setProcessing(true);
    const headers = await getAuthHeaders();
    const data = await safeFetch<{ secret?: string; qrCodeUrl?: string; error?: string }>(
      '/api/admin/mfa/setup',
      { method: 'POST', headers, body: JSON.stringify({ userId: user?.id }) }
    );
    if (!data || data.error) {
      setError(data?.error || 'Failed to initialize MFA setup');
    } else {
      setSetupSecret(data.secret || '');
      setQrUrl(data.qrCodeUrl || '');
      setSetupStep('verify');
    }
    setProcessing(false);
  };

  const verifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyToken || verifyToken.length !== 6) return setError('Please enter a valid 6-digit code');
    setError('');
    setProcessing(true);
    const headers = await getAuthHeaders();
    const data = await safeFetch<{ error?: string }>(
      '/api/admin/mfa/verify',
      { method: 'POST', headers, body: JSON.stringify({ userId: user?.id, token: verifyToken, secret: setupSecret }) }
    );
    if (!data || data.error) {
      setError(data?.error || 'Failed to verify token');
    } else {
      setSuccess('Two-Factor Authentication successfully enabled!');
      setMfaEnabled(true);
      setSetupStep('idle');
      setVerifyToken('');
    }
    setProcessing(false);
  };

  const disableMfa = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make the admin portal vulnerable.')) return;
    setError('');
    setProcessing(true);
    const { error: dbErr } = await supabase.from('user_mfa_secrets').delete().eq('user_id', user?.id);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSuccess('MFA has been disabled.');
      setMfaEnabled(false);
    }
    setProcessing(false);
  };

  if (loading) return <div className="h-64 bg-white/[0.03] animate-pulse rounded-xl" />;

  return (
    <div className="space-y-4 pb-12 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-base font-black dark:text-zinc-100 tracking-tight">Profile & Security</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Manage admin credentials and authentication methods.</p>
      </div>

      {error && (
        <div className="dark:bg-red-500/10 dark:border dark:border-red-500/20 rounded-xl px-4 py-3">
          <p className="dark:text-red-400 text-xs font-semibold text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="dark:bg-emerald-500/10 dark:border dark:border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 dark:text-emerald-400 text-ms-teal flex-shrink-0" />
          <p className="dark:text-emerald-400 text-xs font-semibold text-ms-teal">{success}</p>
        </div>
      )}

      {/* Role Info Card */}
      <div className="dark:bg-ms-admin-surface dark:border bg-violet-300/40  dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3 ">
          <div className="bg-ms-orange-light dark:bg-ms-orange p-2 rounded-lg border border-ms-orange-border">
            <Shield className="h-4 w-4 text-ms-orange dark:text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600"><span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${roleColor}`}>
            {roleLabel}
          </span></p>
            <p className="text-sm font-bold dark:text-zinc-100 mt-0.5">Access Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          
          <span className="text-[11px] text-zinc-600">
            {role === 'super_admin' && 'Full access to all platform features'}
            {role === 'manager' && 'Access to bookings, revenue, and reports'}
            {role === 'support' && 'View-only access to bookings and vendors'}
          </span>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="dark:bg-ms-admin-surface dark:border bg-violet-300/40  dark:border-white/[0.06] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Account</p>
        <div className="flex items-center gap-3">
          <div className="bg-white/[0.04] p-2 rounded-lg">
            <Mail className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-600">Email</p>
            <p className="text-xs font-semibold dark:text-zinc-300 text-ms-orange">{user?.email || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/[0.04] p-2 rounded-lg">
            <User className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-600">User ID</p>
            <p className="text-xs font-mono text-zinc-500">{user?.id?.slice(0, 16)}…</p>
          </div>
        </div>
      </div>

      {/* 2FA Card */}
      <div className="dark:bg-ms-admin-surface dark:border bg-violet-300/40  dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border flex-shrink-0 ${mfaEnabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            <LockKeyhole className={`w-4 h-4 ${mfaEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold dark:text-zinc-100">Two-Factor Authentication</h3>
              {mfaEnabled ? (
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">Enabled</span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">Disabled</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Protect the MicroStay admin portal by adding an extra layer of security. We require Google Authenticator for login.
            </p>

            {mfaEnabled ? (
              <button
                onClick={disableMfa}
                disabled={processing}
                className="text-xs font-bold px-4 py-2 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                Disable 2FA
              </button>
            ) : setupStep === 'idle' ? (
              <button
                onClick={startMfaSetup}
                disabled={processing}
                className="text-xs font-bold px-4 py-2 rounded-lg bg-ms-orange hover:bg-ms-orange/80 text-white transition-colors disabled:opacity-50"
              >
                {processing ? 'Setting up…' : 'Set up Google Authenticator'}
              </button>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-200 mb-1">Step 1 — Scan QR Code</p>
                  <p className="text-[11px] text-zinc-500">Open Google Authenticator → tap <strong className="text-zinc-400">+</strong> → <strong className="text-zinc-400">Scan a QR code</strong>.</p>
                </div>

                {/* QR Code — large and crisp */}
                {qrUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl shadow-lg inline-block">
                      <img src={qrUrl} alt="Google Authenticator QR Code" className="w-48 h-48 block" />
                    </div>
                  </div>
                )}

                {/* Manual entry fallback */}
                {setupSecret && (
                  <details className="group">
                    <summary className="text-[11px] text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-1">
                      <span className="group-open:hidden">▶</span>
                      <span className="hidden group-open:inline">▼</span>
                      Can't scan? Enter code manually
                    </summary>
                    <div className="mt-2 bg-black/30 rounded-lg p-3">
                      <p className="text-[10px] text-zinc-500 mb-1">In Google Authenticator, tap <strong className="text-zinc-400">Enter a setup key</strong> and use:</p>
                      <p className="font-mono text-sm text-ms-orange tracking-widest break-all select-all">{setupSecret}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Account: adminmotel@gmail.com · Type: Time based</p>
                    </div>
                  </details>
                )}

                {/* Step 2 — enter code */}
                <div>
                  <p className="text-xs font-bold text-zinc-200 mb-2">Step 2 — Enter the 6-digit code</p>
                  <form onSubmit={verifyMfaSetup} className="flex gap-2">
                    <input
                      value={verifyToken}
                      onChange={e => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      className="w-32 text-center text-xl tracking-[0.3em] font-mono bg-white/[0.06] border border-white/[0.1] rounded-lg text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-ms-orange/50 py-2.5"
                    />
                    <button
                      type="submit"
                      disabled={processing || verifyToken.length !== 6}
                      className="text-xs font-bold px-4 py-2 rounded-lg bg-ms-orange hover:bg-ms-orange/80 text-white transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Verifying…' : 'Verify & Enable'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
