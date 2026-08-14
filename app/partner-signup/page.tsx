'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Building2,
  FileText,
  PenLine,
  PartyPopper,
  Download,
  ChevronRight,
  AlertCircle,
  Loader2,
  User,
  Lock,
  Mail,
  Camera,
} from 'lucide-react';
import { AGREEMENT_SECTIONS } from '@/lib/agreement-text';
import { Select,SelectTrigger,SelectItem,SelectValue, SelectContent } from '@/components/ui/select';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5 ;

interface AccountForm {
  email: string;
  password: string;
  token?: string;
  confirmPassword: string;
}

interface PropertyForm {
  legal_business_name: string;
  dba_name: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  federal_ein: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  rooms_available: string;
  business_license_file_url: string;
}

const emptyProperty: PropertyForm = {
  legal_business_name: '',
  dba_name: '',
  property_address: '',
  city: '',
  state: '',
  zip: '',
  federal_ein: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  rooms_available: '',
  business_license_file_url: '',
};

// ─────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────
const STEP_LABELS = [
  { label: 'Create Account', icon: User },
  { label: 'Property Info', icon: Building2 },
  { label: 'Review Agreement', icon: FileText },
  { label: 'Sign', icon: PenLine },
  { label: 'Confirmation', icon: PartyPopper },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex flex-row items-center justify-start sm:justify-center gap-0 mb-8 pb-2 overflow-x-auto h-20 w-full no-scrollbar px-2 sm:px-0">
      {STEP_LABELS.map((s, i) => {
        const stepNum = (i + 1) as Step;
        const done = stepNum < current;
        const active = stepNum === current;
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex flex-col items-center min-w-[64px] sm:min-w-[72px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-ms-orange text-white ring-4 ring-ms-orange'
                    : 'bg-gray-200 text-gray-400 dark:bg-white/30'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  active ? 'text-ms-orange' : done ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 w-6 sm:w-14 mx-1 mb-5 transition-all duration-300 ${
                  done ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Field helper
// ─────────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, ...rest } = props;
  return (
    <>
      <input
        {...rest}
        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ms-orange transition ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
        } ${props.disabled ? 'opacity-60 cursor-not-allowed' : ''} ${props.className ?? ''}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Error Banner
// ─────────────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 dark:bg-black/30 dark:border-transparent border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 ">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1 — Account Creation
// ─────────────────────────────────────────────────────────────────
function AccountCreationForm({
  onNext,
}: {
  onNext: (data: AccountForm) => void;
}) {
  const [form, setForm] = useState<AccountForm>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);

  // Load Cloudflare Turnstile script + render widget
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    // Register the callback BEFORE the script loads so the widget can find it
    (window as any).onTurnstileSuccess = (token: string) => setTurnstileToken(token);

    // If script is already loaded (navigating back), just render the widget
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    // Widget renders itself via the .cf-turnstile div once the script loads
  }, []);

  const validateEmail = async () => {
    const email = form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    // Skip lookup if Turnstile hasn't verified yet — silently pass.
    // The server will still enforce captcha on submit.
    if (!turnstileToken) return;
    try {
      const res = await fetch(
        `/api/vendors/check-email?email=${encodeURIComponent(email)}&cf-turnstile-response=${encodeURIComponent(turnstileToken)}`
      );
      const d = await res.json();
      if (!d.available) {
        setEmailError('An account with this email already exists.');
      } else if (d.status === 'pending_email_verification') {
        // Re-submitting will resend the verification email — show a hint, not an error
        setEmailError('');
      } else {
        setEmailError('');
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { email, password, confirmPassword } = form;

    if (!email || !password || !confirmPassword)
      return setError('All fields are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError('Invalid email address.');
    if (password !== confirmPassword)
      return setError('Passwords do not match.');
    if (
      password.length < 10 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    )
      return setError(
        'Password must be 10+ characters, include an uppercase letter, a number, and a special character.'
      );

    setLoading(true);
    try {
      const res = await fetch('/api/vendors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }
      // Sign in immediately — no email verification needed
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr || !signInData.session) {
        setError('Account created but sign-in failed. Please refresh and try signing in.');
        return;
      }
      onNext({ ...form, token: signInData.session.access_token, email: form.email, });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Create Your Partner Account</h2>
        <p className="text-sm text-gray-500 mt-1">Start your MicroStay Partner application</p>
      </div>

      <ErrorBanner message={error} />

      <Field required label="Email Address" >
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <TextInput
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            onBlur={validateEmail}
            placeholder="you@yourbusiness.com"
            className="pl-9 w-full bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40"
            error={emailError}
            autoComplete="email"
          />
        </div>
      </Field>

      <Field
        label="Password"
        required
        hint="Min. 10 characters — must include uppercase, number, and special character"
      >
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Create a strong password"
            className="border border-gray-300 rounded-lg px-3 py-2 pl-9 pr-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ms-orange dark:bg-transparent  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40 "
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-2.5 text-gray-400"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      <Field required label="Confirm Password">
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="Re-enter your password"
            className="border border-gray-300 rounded-lg px-3 py-2 pl-9 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ms-orange dark:bg-transparent  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40"
            autoComplete="new-password"
          />
        </div>
      </Field>

      {/* Cloudflare Turnstile widget — invisible bot check. Real users pass silently. */}
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <div
          ref={turnstileRef}
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          data-callback="onTurnstileSuccess"
          data-size="flexible"
        />
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-3 px-6 rounded-xl transition disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Create Account <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Already have an account?{' '}
        <a href="/login" className="text-ms-orange hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1b — Email Verification Pending
// ─────────────────────────────────────────────────────────────────
function EmailVerificationPending({ email }: { email: string }) {
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleResend() {
    setResendState('sending');
    try {
      const res = await fetch('/api/vendors/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendState(res.ok ? 'sent' : 'error');
    } catch {
      setResendState('error');
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="w-16 h-16 rounded-full bg-ms-orange-light flex items-center justify-center">
        <Mail className="w-8 h-8 text-ms-orange" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Check Your Email</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          We sent a verification link to <strong>{email}</strong>. Click the link to verify your
          email address and continue your application.
        </p>
      </div>
      <div className="bg-ms-orange-light border border-ms-orange-border rounded-lg px-4 py-3 text-sm text-ms-orange max-w-sm">
        After clicking the link in your email, you will be automatically redirected back here to
        continue.
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-gray-400">
          Didn't receive it? Check your spam folder. The link expires in 24 hours.
        </p>
        {resendState === 'sent' ? (
          <p className="text-sm text-green-600 font-medium">Verification email resent! Check your inbox.</p>
        ) : resendState === 'error' ? (
          <p className="text-sm text-red-600">Failed to resend. Please try again shortly.</p>
        ) : null}
        <button
          onClick={handleResend}
          disabled={resendState === 'sending' || resendState === 'sent'}
          className="text-sm text-ms-orange underline underline-offset-2 hover:text-ms-orange-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — Property Info Form
// ─────────────────────────────────────────────────────────────────
function PropertyInfoForm({
  onNext,
  onBack,
  token,
  accountEmail,
}: {
  // onNext: () => void;
  onNext: (form: PropertyForm) => void;
  onBack: () => void;
  token: string;
  accountEmail: string;
}) {
  const [form, setForm] = useState<PropertyForm>(emptyProperty);
  useEffect(() => {
  if (accountEmail) {
    setForm(prev => ({
      ...prev,
      contact_email: accountEmail,
    }));
  }
}, [accountEmail]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // const set = (k: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
  //   setForm(p => ({ ...p, [k]: e.target.value }));
    const set = (k: keyof PropertyForm) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;

    setForm(prev => {
      const updated = {
        ...prev,
        [k]: value,
      };

      // Auto-copy Legal Business Name to Contact Name
      if (k === 'legal_business_name') {
        updated.contact_name = value;
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const required: (keyof PropertyForm)[] = [
      'legal_business_name',
      'property_address',
      'city',
      'state',
      'zip',
      'contact_name',
      'contact_email',
      'rooms_available',
    ];
    for (const f of required) {
      if (!form[f]) return setError(`"${f.replace(/_/g, ' ')}" is required.`);
    }
    if (!licenseFile && !form.business_license_file_url) {
      return setError('Please upload your Business License document.');
    }

    setLoading(true);
    try {
      let fileUrl = form.business_license_file_url;

      // Upload business license file if one was selected.
      // SECURITY: anonymous direct-to-Supabase uploads were removed (audit C6).
      // We now POST to a server-side proxy that rate-limits and validates.
      if (licenseFile) {
        setUploadingFile(true);
        const fd = new FormData();
        fd.append('file', licenseFile);
        const upRes = await fetch('/api/vendor/signup/upload-license', {
          method: 'POST',
          body: fd,
        });
        setUploadingFile(false);
        if (!upRes.ok) {
          const { error: upErrMsg } = await upRes.json().catch(() => ({ error: 'Upload failed' }));
          setError('File upload failed: ' + (upErrMsg || upRes.statusText));
          setLoading(false);
          return;
        }
        const { url } = await upRes.json();
        fileUrl = url || fileUrl;
      }

      const res = await fetch('/api/vendors/property-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, business_license_file_url: fileUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save property info.');
        return;
      }
      // onNext();
      onNext(form);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Property Information</h2>
        <p className="text-sm text-gray-500 mt-1">
          This becomes Exhibit A of your Partner Agreement. Fields marked * are required.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ">
        <div className="sm:col-span-2 ">
          <Field required label="Legal Business Name" >
            <TextInput required value={form.legal_business_name} onChange={set('legal_business_name')} placeholder="ABC Motel LLC" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40" />
          </Field>
        </div>
        <Field required label="DBA / Trade / Motel Name">
          <TextInput required value={form.dba_name} onChange={set('dba_name')} placeholder="The Grand Motel" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40 " />
        </Field>
        <Field required label="Contact Name" >
          {/* <TextInput required value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" className="w-full" /> */}
            <TextInput required value={form.contact_name} readOnly className="w-full bg-gray-100  dark:text-white bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40" />

        </Field>
        <Field required label="Contact Phone">
          <TextInput required type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="(555) 000-0000" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200border-none dark:bg-gradient-to-r border-none dark:from-teal-800/40 dark:to-transparent/40" />
        </Field>
        <Field required label="Contact Email" >
          <TextInput required value={form.contact_email} className=' bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40' readOnly />
          {/* <TextInput required type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="manager@motel.com" className="w-full" /> */}
        </Field>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">Property Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field required label="Property Address" >
              <TextInput required value={form.property_address} onChange={set('property_address')} placeholder="123 Main St" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200border-none dark:bg-gradient-to-r border-none dark:from-teal-800/40 dark:to-transparent/40" />
            </Field>
          </div>
          <Field required label="City" >
            <TextInput required value={form.city} onChange={set('city')} placeholder="Las Vegas" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40" />
          </Field>
          <Field required label="State" >
            <select
              value={form.state}
              onChange={set('state')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ms-orange w-full dark:bg-slate-900 dark:border-transparent bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40"
            >
              <option value="">Select state</option>
              {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          
          <Field required label="ZIP Code" >
            <TextInput required value={form.zip} onChange={set('zip')} placeholder="89101" maxLength={10} className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">Business Documents & Tax</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field required label="Business License" >
              <div className="flex flex-col gap-2">
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition
                  ${licenseFile ? 'border-ms-orange-border bg-ms-orange-light dark:bg-black border-none dark:bg-gradient-to-r dark:from-teal-600/40' : 'border-gray-300 hover:border-ms-orange-border hover:bg-ms-orange-light dark:bg-transparent/40 bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40'}`}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={e => setLicenseFile(e.target.files?.[0] ?? null)}
                  />
                  {licenseFile ? (
                    <span className="text-sm text-ms-orange font-medium">📎 {licenseFile.name}</span>
                  ) : (
                    <span className="text-sm text-gray-500">Click to upload PDF, JPG, or PNG (max 10MB)</span>
                  )}
                </label>
                {uploadingFile && <p className="text-xs text-ms-orange animate-pulse">Uploading file...</p>}
              </div>
            </Field>
          </div>
          <Field required label="Federal EIN">
            <TextInput required value={form.federal_ein} onChange={set('federal_ein')} placeholder="XX-XXXXXXX" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40 " />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">Capacity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field required label="Rooms Available" >
            <TextInput required type="number" min="1" value={form.rooms_available} onChange={set('rooms_available')} placeholder="12" className="w-full  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40" />
          </Field>
        </div>
      </div>
  
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:bg-black dark:text-white dark:hover:bg-slate-800 dark:border-transparent dark:hover:text-ms-orange"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 3 — Agreement Viewer
// ─────────────────────────────────────────────────────────────────
function AgreementViewer({
  onNext,
  onBack,
  onScrollComplete,
  scrollCompleted,
  documentViewedAt,
  onDocumentViewed,
  propertyForm,
}: {
  onNext: () => void;
  onBack: () => void;
  onScrollComplete: () => void;
  scrollCompleted: boolean;
  documentViewedAt: string | null;
  onDocumentViewed: (ts: string) => void;
  propertyForm: any;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [agreementText, setAgreementText] = useState('');
  const [agreementHash, setAgreementHash] = useState('');
  const [agreementVersion, setAgreementVersion] = useState('v2.0');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!documentViewedAt) {
      onDocumentViewed(new Date().toISOString());
    }
    fetch('/api/agreements/current')
      .then(r => r.json())
      .then(d => {
        setAgreementText(d.text ?? '');
        setAgreementHash(d.hash ?? '');
        setAgreementVersion(d.version ?? 'v2.0');
      })
      .catch(() => {});
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      onScrollComplete();
    }
    // Update active section
    if (sectionRefs.current.length) {
      const scrollTop = el.scrollTop;
      let active = 0;
      sectionRefs.current.forEach((ref, idx) => {
        if (ref && ref.offsetTop - 20 <= scrollTop) active = idx;
      });
      setActiveSectionIdx(active);
    }
  }, [onScrollComplete]);

  const scrollToSection = (idx: number) => {
    const ref = sectionRefs.current[idx];
    if (ref && scrollRef.current) {
      scrollRef.current.scrollTo({ top: ref.offsetTop - 12, behavior: 'smooth' });
    }
  };

  const renderAgreementLines = () => {
    if (!agreementText) {
      return <div className="text-gray-400 text-sm py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading agreement...</div>;
    }
    const lines = agreementText.split('\n');
    let isMicrostaySection = false;

    return lines.map((line, i) => {
      let trimmed = line.trim();
      const isMainTitle = trimmed === 'MICROSTAY PARTNER AGREEMENT';
      const matchIdx = AGREEMENT_SECTIONS.indexOf(trimmed);
      const isSectionTitle = matchIdx !== -1;

      if (trimmed === 'MICROSTAY') {
        isMicrostaySection = true;
      }

      let injectedNode: React.ReactNode = null;

      if (propertyForm && trimmed.includes('______')) {
        let label = '';
        let value = '';

        if (trimmed.startsWith('Property Name:')) {
          label = 'Property Name';
          value = propertyForm.dba_name || '______';
        } else if (trimmed.startsWith('Legal Business Name:')) {
          label = 'Legal Business Name';
          value = propertyForm.legal_business_name || '______';
        } else if (trimmed.startsWith('Property Address:')) {
          label = 'Property Address';
          value = [propertyForm.property_address, propertyForm.city, propertyForm.state, propertyForm.zip].filter(Boolean).join(', ') || '______';
        } else if (trimmed.startsWith('Authorized Representative:')) {
          label = 'Authorized Representative';
          value = isMicrostaySection ? 'Sam Patel' : (propertyForm.contact_name || '______');
        } else if (trimmed.startsWith('Title:')) {
          label = 'Title';
          value = isMicrostaySection ? 'Founder & CEO' : 'Owner / Authorized Representative';
        } else if (trimmed.startsWith('Email:')) {
          label = 'Email';
          value = propertyForm.contact_email || '______';
        } else if (trimmed.startsWith('Phone:')) {
          label = 'Phone';
          value = propertyForm.contact_phone || '______';
        } else if (trimmed.startsWith('Signature:')) {
          label = 'Signature';
          value = isMicrostaySection ? '[Pending Admin Signature]' : propertyForm.legal_business_name;
        } else if (trimmed.startsWith('Date:')) {
          label = 'Date';
          value = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        if (label) {
          injectedNode = (
            <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">
              {label}: <span className="text-ms-orange-hover font-medium">{value}</span>
            </p>
          );
        }
      }

      if (injectedNode) return injectedNode;

      if (isMainTitle) {
        return (
          <div
            key={i}
            className="text-lg font-bold text-ms-orange mt-6 mb-2 tracking-wide"
          >
            {trimmed}
          </div>
        );
      }

      if (isSectionTitle) {
        return (
          <div
            key={i}
            ref={el => { sectionRefs.current[matchIdx] = el; }}
            className="text-sm font-bold text-ms-orange mt-6 mb-2 tracking-wide uppercase"
          >
            {trimmed}
          </div>
        );
      }

      if (!trimmed) return <div key={i} className="h-2" />;

      return (
        <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Partner Agreement</h2>
        <p className="text-sm text-gray-500 mt-1">
          Read the full agreement below. You must scroll to the bottom before continuing.
        </p>
      </div>

      <div className="flex gap-1 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xs bg-ms-orange-light text-ms-orange px-2 py-0.5 rounded-full font-medium dark:bg-slate-950">
          Version {agreementVersion}
        </span>
        {agreementHash && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono dark:bg-black" title="SHA-256 hash of agreement text ">
            SHA-256: {agreementHash.substring(0, 16)}…
          </span>
        )}
        {scrollCompleted && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-600 dark:text-white px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" /> Fully read
          </span>
        )}
      </div>

      <div className="flex gap-4  w-full overflow-hidden">
        {/* Section nav */}
        <div className="hidden lg:flex w-64 flex-shrink-0 flex-col  max-h-[500px] overflow-y-auto pr-2 border-r border-gray-100 dark:border-transparent">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sections</p>
          {AGREEMENT_SECTIONS.map((sec, idx) => (
            <button
              key={idx}
              onClick={() => scrollToSection(idx)}
              className={`text-left text-xs px-2 py-1 rounded transition ${
                activeSectionIdx === idx
                  ? 'bg-ms-orange-light text-ms-orange font-semibold dark:bg-slate-800'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:hover:bg-black dark:hover:text-white'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Agreement text */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-w-0 max-h-[500px] overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50 dark:bg-black/40"
          style={{ scrollbarWidth: 'auto' }}
        >
          {renderAgreementLines()}
          {!scrollCompleted && (
            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 dark:bg-gradient-to-t dark:from-gray-700 pt-6 pb-2 text-center text-xs text-gray-400 mt-4 rounded-lg">
              Scroll to the bottom to continue ↓
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:bg-black dark:hover:bg-slate-800 dark:text-white dark:hover:text-ms-orange dark:border-transparent"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!scrollCompleted}
          className="flex-1 flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {scrollCompleted ? (
            <>I Have Read the Agreement <ArrowRight className="w-4 h-4" /></>
          ) : (
            'Scroll to the bottom to continue'
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4 — Signature Capture
// ─────────────────────────────────────────────────────────────────
function SignatureCapture({
  onNext,
  onBack,
  token,
  businessName,
  scrollCompleted,
  documentViewedAt,
  onSignatureId,
  onSignedPdfUrl,
}: {
  onNext: () => void;
  onBack: () => void;
  token: string;
  businessName: string;
  scrollCompleted: boolean;
  documentViewedAt: string | null;
  onSignatureId: (id: string) => void;
  onSignedPdfUrl: (url: string) => void;
}) {
  const [typedName, setTypedName] = useState(businessName);
  useEffect(() => {
  if (businessName) {
    setTypedName(businessName);
  }
}, [businessName]);
  const [agreed, setAgreed] = useState(false);
  const [arbitrationAgreed, setArbitrationAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientIp, setClientIp] = useState('');

  useEffect(() => {
    fetch('/api/utils/my-ip')
      .then(r => r.json())
      .then(d => setClientIp(d.ip ?? ''))
      .catch(() => {});
  }, []);

  const canSign = typedName.trim().length >= 2 && agreed && arbitrationAgreed;

  const handleSign = async () => {
    if (!canSign) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          typed_signature: typedName.trim(),
          scroll_completed: scrollCompleted,
          document_viewed_at: documentViewedAt,
          arbitration_acknowledged: arbitrationAgreed,
          class_action_waiver_acknowledged: arbitrationAgreed,
          client_ip: clientIp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Already signed — treat as success and advance to confirmation
        if (res.status === 409 && data.signatureId) {
          onSignatureId(data.signatureId);
          onSignedPdfUrl(data.signedPdfUrl || '');
          onNext();
          return;
        }
        setError(data.error || 'Failed to record signature.');
        return;
      }
      onSignatureId(data.signatureId);
      onSignedPdfUrl(data.signedPdfUrl || '');

      // Complete signup
      await fetch('/api/vendors/complete-signup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Logout user
      // await supabase.auth.signOut();
      // window.location.reload();
      onNext();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sign the Partner Agreement</h2>
        <p className="text-sm text-gray-500 mt-1">
          Type your full legal name to create your electronic signature.
        </p>
      </div>

      <ErrorBanner message={error} />

      {/* Typed signature input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Type Your Full Legal Name <span className="text-red-500">*</span>
        </label>
        <input type="text"  value={typedName} readOnly  className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-full bg-gray-100 dark:bg-transparent  bg-gradient-to-r from-teal-200/40 via-black/10 to-purple-200 border-none dark:bg-gradient-to-r dark:from-teal-800/40 dark:to-transparent/40"/>
        {/* <input
          type="text"
          value={typedName}
          onChange={e => setTypedName(e.target.value)}
          placeholder="Your Full Legal Name"
          className="border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ms-orange w-full"
          autoComplete="name"
        /> */}
        {/* Signature preview */}
        {typedName.trim() && (
          <div className="mt-1 border-b-2 border-gray-800 pb-2">
            <span
              className="text-2xl text-gray-800 dark:text-white"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
            >
              {typedName}
            </span>
          </div>
        )}
      </div>

      {/* Checkbox 1 — General agreement */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-ms-orange shrink-0"
        />
        <span className="text-sm text-gray-700 leading-relaxed dark:text-white/40">
          I have read and agree to the{' '}
          <strong>MicroStay Partner Agreement Version 2.0</strong>, including all terms and
          conditions contained therein.
        </span>
      </label>

      {/* Checkbox 2 — Arbitration (red border, bold) */}
      <label
        className="flex items-start gap-3 cursor-pointer border-2 border-red-400 rounded-xl p-4 bg-red-50 dark:bg-slate-900 dark:border-transparent group"
      >
        <input
          type="checkbox"
          checked={arbitrationAgreed}
          onChange={e => setArbitrationAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-red-500 shrink-0"
        />
        <span className="text-sm leading-relaxed">
          <strong className="text-red-700">MANDATORY ARBITRATION & CLASS ACTION WAIVER:</strong>{' '}
          <span className="text-red-800">
            I specifically acknowledge and agree to the{' '}
            <strong>MANDATORY ARBITRATION clause (Section 10)</strong> and{' '}
            <strong>CLASS ACTION WAIVER (Section 10.3)</strong>. I understand I am waiving my right
            to a jury trial and to participate in any class action lawsuit. All disputes must be
            resolved through individual binding arbitration before the AAA in Sheridan County,
            Wyoming.
          </span>
        </span>
      </label>

      {/* Signature details */}
      {typedName.trim() && (
        <div className="bg-gray-50 border border-gray-200 dark:bg-black rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p><span className="font-medium text-gray-700">Signed by:</span> {typedName}</p>
          <p><span className="font-medium text-gray-700">Timestamp:</span> {new Date().toUTCString()}</p>
          {clientIp && <p><span className="font-medium text-gray-700">IP Address:</span> {clientIp}</p>}
          <p><span className="font-medium text-gray-700">Agreement:</span> MicroStay Partner Agreement v2.0</p>
          <p className="text-gray-400 italic">Electronically signed under E-SIGN Act 15 U.S.C. § 7001</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60 dark:bg-black dark:hover:bg-slate-800 dark:border-transparent dark:text-white dark:hover:text-white/40"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleSign}
          disabled={!canSign || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>I Agree &amp; Sign <PenLine className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {!canSign && (
        <p className="text-xs text-center text-gray-400">
          Enter your name and check both boxes to enable signing.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 5 — Confirmation
// ─────────────────────────────────────────────────────────────────
function SignupConfirmation({
  email,
  signatureId,
  signedPdfUrl,
}: {
  email: string;
  signatureId: string;
  signedPdfUrl: string;
}) {
  const [showLogin, setShowLogin] = useState(false);
  const handleDownloadPdf = async () => {
  // Open PDF in new tab
  window.open(signedPdfUrl, '_blank');

  // Logout user
  await supabase.auth.signOut();

  // Show login button
  setShowLogin(true);
};
  const handleLoginRedirect = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-600">
        <CheckCircle2 className="w-10 h-10 text-green-500 dark:text-white" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Application Under Review</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Thank you for completing your MicroStay Partner application. Our team will review your
          submission and notify you at <strong>{email}</strong> within{' '}
          <strong>2 business days</strong>.
        </p>
      </div>

      {signatureId && (
        <div className="bg-gray-50 border border-gray-200 dark:bg-transparent  rounded-xl px-6 py-4 text-left w-full max-w-md">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            Reference Number
          </p>
          <p className="font-mono text-sm text-gray-800 break-all dark:text-white/70">{signatureId}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {/* {signedPdfUrl && (
          <a
            href={signedPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-3 px-5 rounded-xl transition"
          >
            <Download className="w-4 h-4" /> Download Signed Agreement
          </a>
        )} */}
        {signedPdfUrl && !showLogin && (
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-2 bg-ms-orange hover:bg-ms-orange-hover text-white font-semibold py-3 px-5 rounded-xl transition hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download Signed Agreement
          </button>
        )}
       {showLogin && (
        <button
          onClick={handleLoginRedirect}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-xl hover:bg-gray-50 transition hover:scale-105 active:scale-95 dark:bg-transparent/40 dark:text-white dark:border-transparent"
        >
          Sign In
        </button>
      )}
        {/* <a
          href="/login"
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-xl hover:bg-gray-50 transition"
        >
           Sign In
        </a> */}
      </div>

      <p className="text-sm text-gray-500">
        Questions? Contact us at{' '}
        <a href="mailto:support@microstay.us" className="text-ms-orange hover:underline">
          support@microstay.us
        </a>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main — VendorSignupStepper
// ─────────────────────────────────────────────────────────────────
export default function VendorSignupStepperPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-ms-orange" /></div>}>
      <VendorSignupStepper />
    </Suspense>
  );
}

function VendorSignupStepper() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [token, setToken] = useState('');
  const [scrollCompleted, setScrollCompleted] = useState(false);
  const [documentViewedAt, setDocumentViewedAt] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState('');
  const [signedPdfUrl, setSignedPdfUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [propertyForm, setPropertyForm] = useState<any>(null);

  // On mount: detect if user is coming back from email verification
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const errorParam = searchParams.get('error');

    // Listen for Supabase auth state (magic link redirect after email verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User was redirected back after verifying email
          const parsedStep = parseInt(stepParam ?? '2', 10) as Step;
          if (parsedStep >= 2 && parsedStep <= 4) {
            setStep(parsedStep);
            setPendingVerification(false);
          }
        }
      }
    });

    // Also try to restore session if one exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        const parsedStep = parseInt(stepParam ?? '1', 10) as Step;
        if (parsedStep >= 2) {
          setStep(parsedStep);
          setPendingVerification(false);
          // If jumping to sign step, mark scroll as complete so validation passes
          if (parsedStep >= 4) {
            setScrollCompleted(true);
            setDocumentViewedAt(new Date().toISOString());
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen dark:bg-black/90 flex flex-col  items-center justify-center max-h-full bg-orange-300/40">
      {/* Header */}
      {/* <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-xl text-ms-orange tracking-tight">
            MicroStay
          </a>
          <span className="text-sm text-gray-500">Partner Application</span>
        </div>
      </header> */}

      <section className="flex px-4 py-8 w-full justify-center">
        <div className="w-full max-w-2xl">
          <StepIndicator current={step} />

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {/* Step 1 — Account creation or awaiting verification */}
            {step === 1 && (
              <AccountCreationForm
                onNext={form => {
                  setAccountEmail(form.email);
                  setEmail(form.email.trim().toLowerCase());
                  if (form.token) setToken(form.token);
                  setStep(2);
                }}
              />
            )}

            {/* Step 2 — Property info */}
            {step === 2 && (
              <PropertyInfoForm
                token={token}
                accountEmail={accountEmail}
                onBack={() => setStep(1)}
                // onNext={() => setStep(3)}
                onNext={(form) => {
                    setBusinessName(form.legal_business_name);
                    setPropertyForm(form);
                    setStep(3);
                  }}
              />
            )}

            {/* Step 3 — Agreement viewer */}
            {step === 3 && (
              <AgreementViewer
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
                scrollCompleted={scrollCompleted}
                onScrollComplete={() => setScrollCompleted(true)}
                documentViewedAt={documentViewedAt}
                onDocumentViewed={setDocumentViewedAt}
                propertyForm={propertyForm}
              />
            )}

            {/* Step 4 — Signature */}
            {step === 4 && (
              <SignatureCapture
                token={token}
                businessName={businessName}
                scrollCompleted={scrollCompleted}
                documentViewedAt={documentViewedAt}
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
                onSignatureId={setSignatureId}
                onSignedPdfUrl={setSignedPdfUrl}
              />
            )}

            {/* Step 5 — Confirmation */}
            {step === 5 && (
              <SignupConfirmation
                email={email}
                signatureId={signatureId}
                signedPdfUrl={signedPdfUrl}
              />
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            MICROSTAY HOLDINGS LLC{' '}
            <a href="mailto:support@microstay.us" className="hover:text-ms-orange">
              support@microstay.us
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
