# Audit Changes Summary

This document lists all of the specific changes made to resolve the MicroStay audit items.

---

## 1. 48-Hour Engine Fix
*   **File**: [`app/api/cron/commissions/route.ts`](file:///c:/Users/navth/merging/microstay/app/api/cron/commissions/route.ts)
*   **Change**: Modified the cron from checking `created_at` to calculating actual deadline using slot end times: `booking_date + slot.end_hour + 48 hours`.
*   **Detail**: Prevented future stays from being auto-canceled early. Booking statuses are evaluated cleanly, updating overdue stays to `no_show`. Per Agreement §17, no-shows do not owe commission, so `penalty_fee` defaults to `0`.

---

## 2. Month-End Auto-Complete Cron
*   **File**: [`app/api/cron/auto-complete/route.ts`](file:///c:/Users/navth/merging/microstay/app/api/cron/auto-complete/route.ts) *(NEW)*
*   **Change**: Created a new server cron scheduled on the 1st of the month at 06:00 UTC.
*   **Detail**: Auto-completes any outstanding `pending` bookings from the previous calendar month, converting them to `checked_in`. The vendor is billed the canonical 12% commission because they failed to reconcile them before month-end (Agreement §15).

---

## 3. Payment Reminders & Deactivation Engine
*   **Files**:
    *   [`app/api/cron/remind-payment/route.ts`](file:///c:/Users/navth/merging/microstay/app/api/cron/remind-payment/route.ts) *(NEW)*
    *   [`app/api/cron/deactivate-overdue/route.ts`](file:///c:/Users/navth/merging/microstay/app/api/cron/deactivate-overdue/route.ts) *(NEW)*
    *   [`vercel.json`](file:///c:/Users/navth/merging/microstay/vercel.json)
*   **Change**: Implemented email alert and suspension flows.
*   **Detail**:
    *   `remind-payment` triggers on the 5th (first payment reminder) and 25th (final deactivation warning).
    *   `deactivate-overdue` runs on the 26th, suspending vendors with unpaid invoices, marking them `suspended` with a reason string, and adding a 25% reinstatement charge onto the invoice's due total.
    *   Removed `/api/cron/invoices` schedule entry and marked [`app/api/cron/invoices/route.ts`](file:///c:/Users/navth/merging/microstay/app/api/cron/invoices/route.ts) as a disabled 410 Gone stub.

---

## 4. Commission & Cancellation Penalty Adjustments
*   **Files**:
    *   [`app/vendor/dashboard/page.tsx`](file:///c:/Users/navth/merging/microstay/app/vendor/dashboard/page.tsx)
    *   [`app/vendor/bookings/page.tsx`](file:///c:/Users/navth/merging/microstay/app/vendor/bookings/page.tsx)
*   **Change**: Cleared cancel penalty amounts.
*   **Detail**: Changed `penalty_fee: 5.0` or calculated flat fees to `0` when vendors perform cancellation actions. Per Agreement §18, cancellations do not incur commission fees.

---

## 5. Partner Agreement v3.1
*   **File**: [`lib/agreement-text.ts`](file:///c:/Users/navth/merging/microstay/lib/agreement-text.ts)
*   **Change**: Bumped constant `AGREEMENT_VERSION` to `v3.1`, corrected body text date, and aligned Sections 32-38 with California law and the new billing timeline.
*   **Detail**: Written sections specify: invoice on the 1st, first reminder on the 5th, final reminder on the 25th, suspension on the 26th, and a 25% reactivation penalty (with reference to California Civil Code Section 1671).

---

## 6. Partner Landing Page Fixes
*   **File**: [`app/partner/page.tsx`](file:///c:/Users/navth/merging/microstay/app/partner/page.tsx)
*   **Change**: Updated wording regarding onboarding requirements.
*   **Detail**: Changed photo requirements to state they are uploaded after application approval. Removed the unsupported "2-hour legal requirement" claim and uncommented the 12% monthly billing details.

---

## 7. Credential & Authentication Hardening
*   **Files**:
    *   [`tests/e2e/98-full-portal-audit.spec.ts`](file:///c:/Users/navth/merging/microstay/tests/e2e/98-full-portal-audit.spec.ts)
    *   [`tests/e2e/helpers/auth.ts`](file:///c:/Users/navth/merging/microstay/tests/e2e/helpers/auth.ts)
    *   [`app/admin/login/page.tsx`](file:///c:/Users/navth/merging/microstay/app/admin/login/page.tsx)
    *   [`.env.local`](file:///c:/Users/navth/merging/microstay/.env.local)
    *   [`.env.test.example`](file:///c:/Users/navth/merging/microstay/.env.test.example)
*   **Change**: Extracted credentials from source files.
*   **Detail**: Replaced plaintext admin passwords and emails with reads from `process.env`. Centralized admin identity verification around `process.env.NEXT_PUBLIC_ADMIN_EMAIL` instead of hardcoding `adminmotel@gmail.com`.

---

## 8. Workspace File Cleanup
*   **Change**: Removed temporary runtime build logs and outdated documentation to prevent confusion.
*   **Detail**: Deleted files include: `build-sec.log`, `build_final2.log`, `live_smoke.log`, `test.html`, `EASIEST_SOLUTION.md`, `SUPER_EASY_UPDATE.md`, `GITHUB_UPDATES_FEE_CHANGE.md`, and the `UPLOAD_FILES` staging folder.
