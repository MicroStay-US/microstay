# MicroStay Launch Runbook

Step-by-step checklist to get microstay.us live in production.
Everything that could be automated has already been done — this file only
contains the steps that require you to click buttons in external dashboards.

**Estimated time: 45–60 minutes.**

---

## Pre-flight check (already done ✓)

- [x] Production build passes (`npm run build` → exit 0)
- [x] TypeScript clean (`npx tsc --noEmit` → exit 0)
- [x] Customer-facing e2e tests passing (21/21)
- [x] Resend API key in `.env.local`
- [x] Strong `CRON_SECRET` generated (in `.env.local`)
- [x] `NEXT_PUBLIC_SITE_URL` set to `https://www.microstay.us`
- [x] `vercel.json` has all 3 cron jobs wired up
- [x] Sentry `global-error.tsx` + `instrumentation-client.ts` added
- [x] Nested `<main>` HTML bug in `/partner-signup` fixed
- [x] Stale test selectors fixed
- [x] Supabase production DB (`sznxbdjzlwpzugiavjwg`) schema verified

---

## Step 1 — Stripe webhook endpoint (10 min)

1. Go to https://dashboard.stripe.com/webhooks
2. Confirm you are in **LIVE mode** (toggle at top-left: "Viewing test data" = OFF)
3. Click **Add endpoint**
4. **Endpoint URL**: `https://www.microstay.us/api/vendor/billing/webhook`
5. **Description**: `MicroStay production — vendor billing`
6. **Events to send** — click "Select events" and check these 4:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
7. Click **Add endpoint**
8. On the created endpoint page, click **Reveal** under "Signing secret"
9. Copy the `whsec_...` value — you'll need it in Step 2

---

## Step 2 — Vercel production environment variables (10 min)

1. Open `C:\Users\night\Documents\microstay-vercel-env.txt`
   (⚠ This file lives OUTSIDE the git repo so it can't be accidentally committed.)
2. Go to your Vercel project → **Settings → Environment Variables**
3. For each variable in the file:
   - Add key + value
   - Check **Production** (and optionally Preview + Development)
   - Click **Save**
4. For the variables marked `REPLACE_ME`, use these real values:

   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com/apikeys (live mode) |
   | `STRIPE_SECRET_KEY` | Same page — click "Reveal live key" |
   | `STRIPE_WEBHOOK_SECRET` | From Step 1 above (`whsec_...`) |
   | `NEXT_PUBLIC_SENTRY_DSN` | https://sentry.io → your project → Settings → Client Keys |
   | `SENTRY_ORG` | Your Sentry org slug (URL fragment) |
   | `SENTRY_AUTH_TOKEN` | https://sentry.io/settings/account/api/auth-tokens/ (scopes: `project:releases`, `org:read`) |

5. After saving all variables, click **Redeploy** on the latest deployment so
   the new env vars take effect.
6. **Delete the local file** once pasted:
   ```
   del "C:\Users\night\Documents\microstay-vercel-env.txt"
   ```

### ⚠ Secret rotation recommended

During initial setup, a secrets file was briefly committed to this PRIVATE
git repo, then scrubbed from history and force-pushed. Exposure window was
seconds-to-minutes and only to collaborators with repo access. For safety,
rotate these before launch:

- **`SUPABASE_SERVICE_ROLE_KEY`**: Supabase Dashboard → Project Settings →
  API → **Reset `service_role` key**. Update Vercel + `.env.local` + the
  secrets file at `C:\Users\night\Documents\microstay-vercel-env.txt`.
- **`ADMIN_PASSWORD`**: Pick a new strong password, update everywhere.
- **`RESEND_API_KEY`**: Resend Dashboard → API Keys → delete the old key
  (`re_crWfo3sT_...`) → create a new one. Update everywhere.
- **`CRON_SECRET`**: Already rotated during cleanup. New value is in
  `.env.local` and the secrets file.

---

## Step 3 — Custom domain on Vercel (15 min, mostly waiting)

1. Vercel project → **Settings → Domains**
2. Add `microstay.us` → click **Add**
3. Add `www.microstay.us` → set as the primary (recommended) and redirect
   `microstay.us` → `www.microstay.us`
4. Vercel will show you either:
   - **A record**: `76.76.21.21` (for apex `microstay.us`)
   - **CNAME**: `cname.vercel-dns.com` (for `www.microstay.us`)
5. Go to your domain registrar (GoDaddy / Namecheap / Cloudflare / etc.)
6. Add the records Vercel told you about
7. SSL cert is auto-provisioned once DNS resolves (1–60 minutes)

---

## Step 4 — Resend sending domain (10 min + DNS wait)

Without this, emails from `reservations@microstay.us` and `noreply@microstay.us`
will bounce.

1. Go to https://resend.com/domains
2. Click **Add Domain** → enter `microstay.us`
3. Resend will show 3–4 DNS records to add:
   - `MX` record (for `send.microstay.us`)
   - `TXT` record for SPF
   - `TXT` record for DKIM (one long one)
   - Optionally `TXT` for DMARC
4. Add each record at your domain registrar (same place as Step 3)
5. Back in Resend, click **Verify DNS Records**
6. Wait until all show green ✓ (usually 5–30 minutes)

Then, in Resend → **API Keys**, confirm the key you pasted into Vercel has
**Send access** scope for `microstay.us`.

---

## Step 5 — Enable Supabase leaked-password protection (2 min)

The Supabase advisor flagged this as a WARN.

1. Go to https://supabase.com/dashboard/project/sznxbdjzlwpzugiavjwg/auth/providers
2. Scroll to **Password Security** section
3. Toggle **Prevent use of leaked passwords** ON
4. Save

(This checks new passwords against HaveIBeenPwned during signup/reset.)

---

## Step 6 — Verify Vercel cron (2 min)

1. Vercel project → **Settings → Cron Jobs**
2. You should see 3 entries (they're loaded from `vercel.json`):
   - `/api/cron/commissions` — daily 00:00 UTC
   - `/api/cron/bill-month` — 1st of month 06:00 UTC
   - `/api/cron/invoices` — 1st of month 07:00 UTC
3. If they're not listed, redeploy — they pick up from `vercel.json` on deploy.

---

## Step 7 — Post-launch smoke test (10 min)

Once the domain is live, run these checks manually in order:

1. **Public homepage** — `https://www.microstay.us` loads, hero visible, footer visible
2. **Search** — pick a city that has motels, results appear
3. **Motel detail** — click a motel, detail page loads
4. **Booking flow** — select a slot, fill the form, submit
5. **Guest email** — check the test inbox, confirmation email arrives (from `reservations@microstay.us`)
6. **Vendor email** — vendor gets a booking notification
7. **Vendor login** — sign in, see the booking in vendor dashboard
8. **Admin login** — go to `/admin/login`, enter admin password, receive OTP email, enter OTP, land on admin dashboard
9. **Stripe test charge** — trigger a real $1 charge, confirm Stripe dashboard shows it AND the webhook endpoint (Stripe → Webhooks → your endpoint → recent deliveries) shows 200 OK
10. **Sentry smoke test** — visit `https://www.microstay.us/not-a-real-page-that-crashes` (or force an error) and confirm Sentry receives it

---

## Nice-to-haves (do within first week)

- [ ] Enable Supabase **Point-in-time Recovery (PITR)** backups (paid tier only) for data-loss protection
- [ ] Set up Sentry alert rule: "email me on new production error, rate > 10/min"
- [ ] Set up Vercel deploy notifications in Slack or email
- [ ] Set up a UptimeRobot / BetterUptime monitor on `https://www.microstay.us`
- [ ] Add `TEST_ADMIN_PASSWORD`, `TEST_VENDOR_EMAIL`, `TEST_VENDOR_PASSWORD` to
      a CI secret so the vendor/admin e2e suites can run in CI

---

## Rollback plan

If something breaks post-launch:

1. **Bad deploy**: Vercel → Deployments → find last-known-good → click **Promote to Production**
2. **Bad migration**: Supabase dashboard → **Database → Backups** → restore to pre-migration point
3. **Stripe webhook failing**: disable the webhook endpoint in Stripe to stop retries, investigate, re-enable
4. **Email storm**: Resend dashboard → pause the API key to stop all sends

---

## Questions / support

- **Claude agent**: ask me to help with any of these steps — I can walk you
  through dashboards click-by-click, or generate DNS records from Resend's output
- **Supabase**: https://supabase.com/support
- **Stripe**: https://support.stripe.com
- **Resend**: https://resend.com/support
- **Vercel**: https://vercel.com/support
