# MicroStay Security & Deployment Guide

## 1. Required Environment Variables (Vercel Dashboard)

Go to **Vercel → Project → Settings → Environment Variables** and add all of these.
Mark the ones labeled SENSITIVE as "Secret" so they are not visible in logs.

### Supabase
| Variable | Description | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only | **SECRET** |

### Stripe
| Variable | Description | Sensitivity |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` — never expose client-side | **SECRET** |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Public |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard → Webhooks | **SECRET** |

### Email (Resend)
| Variable | Description | Sensitivity |
|---|---|---|
| `RESEND_API_KEY` | From resend.com/api-keys | **SECRET** |

### Cron Jobs
| Variable | Description | Sensitivity |
|---|---|---|
| `CRON_SECRET` | Random 32-char string — protects /api/cron/* routes | **SECRET** |

### Destructive Operations
| Variable | Description | Sensitivity |
|---|---|---|
| `NUKE_SECRET` | Random 32-char string — required as x-nuke-secret header to call /api/nuke | **SECRET** |

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Email: Resend Domain Verification + DKIM/SPF/DMARC

Without these, your emails land in spam and your domain can be spoofed.

### Step 1 — Add domain in Resend
1. Log in to [resend.com](https://resend.com)
2. Go to **Domains → Add Domain**
3. Enter `microstay.us`
4. Resend will give you DNS records to add

### Step 2 — Add DNS records (in your domain registrar / Cloudflare)

**SPF** (TXT record on `microstay.us`):
```
v=spf1 include:amazonses.com ~all
```

**DKIM** (TXT record — Resend gives you the exact value):
```
Name:  resend._domainkey.microstay.us
Value: <provided by Resend>
```

**DMARC** (TXT record on `_dmarc.microstay.us`):
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@microstay.us; pct=100
```
> Start with `p=none` (monitoring only) for the first 2 weeks, then switch to `p=quarantine`.

### Step 3 — Update your from address in email routes
Once verified, change email sends from `onboarding@resend.dev` to:
```
MicroStay <no-reply@microstay.us>
```

### Step 4 — Verify in Resend dashboard
After adding DNS records, click "Verify" in Resend. DNS propagation can take up to 24h.

---

## 3. Vercel Cron Job

Your `vercel.json` already has:
```json
{ "path": "/api/cron/commissions", "schedule": "0 0 * * *" }
```

Make sure your cron route checks:
```typescript
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 4. Stripe Webhook

In **Stripe Dashboard → Developers → Webhooks**:
- Endpoint URL: `https://microstay.us/api/vendor/billing/webhook`
- Events to listen for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## 5. Supabase RLS (Row Level Security)

Verify in **Supabase → Authentication → Policies** that:
- `profiles` table: users can only read/update their own row
- `vendors` table: vendors can only read their own row
- `bookings` / `vd_bookings`: public can insert, vendors can read their own
- `invoices`: only accessible by service role (admin-only)

Run this query to check which tables have RLS disabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

---

## 6. Rate Limits Reference

Implemented in `lib/rate-limit.ts` (sliding window, in-process):

| Endpoint | Limit |
|---|---|
| `POST /api/booking/create` | 10 requests / 10 min / IP |
| `POST /api/vendor/signup` | 5 requests / 1 hour / IP |
| `POST /api/vendor/status` | 30 requests / 1 min / IP |

> **Upgrade path:** For high-traffic production, replace the in-memory store with
> [Upstash Redis](https://upstash.com) — set `UPSTASH_REDIS_REST_URL` and
> `UPSTASH_REDIS_REST_TOKEN`, then swap `lib/rate-limit.ts` for `@upstash/ratelimit`.

---

## 7. Security Headers (already configured in next.config.js)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` — blocks inline frames, restricts connect-src to Supabase/Resend/OSM
