# MicroStay Project Details

This document provides a detailed overview of the MicroStay platform, describing its architecture, key modules, technology stack, and core business flows.

---

## 1. Project Overview

MicroStay is an hourly motel booking platform designed to optimize motel room occupancy. The platform allows customers to book flexible, short-term lodging (by the hour) while giving motel vendors complete control over availability, customizable slot durations, and pricing.

---

## 2. Technology Stack

*   **Framework**: [Next.js](https://nextjs.org/) (React/TypeScript, utilizing both App Router for pages/API endpoints and Tailwind CSS for styling)
*   **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL backend with built-in Authentication and Row Level Security)
*   **Payment Processor**: [Stripe](https://stripe.com/) (Stripe billing API, hosted invoice screens, and customer portals)
*   **Transactional Emails**: [Resend](https://resend.com/) (sending automated invoices, reminders, and signup notifications)
*   **Testing**: [Playwright](https://playwright.dev/) (End-to-End browser test automation)

---

## 3. Core Modules & Directories

*   [`app/`](file:///c:/Users/navth/merging/microstay/app/): Main application routes.
    *   [`app/admin/`](file:///c:/Users/navth/merging/microstay/app/admin/): Admin dashboard tabs (Command Center, Live Bookings, Approval Queue, Guest Management, Reports).
    *   [`app/vendor/`](file:///c:/Users/navth/merging/microstay/app/vendor/): Partner portal for room/slot setup, calendar, bookings, billing, and staff permissions.
    *   [`app/partner/`](file:///c:/Users/navth/merging/microstay/app/partner/): Partner details, requirements list, and sign-up page routes.
    *   [`app/search/`](file:///c:/Users/navth/merging/microstay/app/search/): Guest search interface to filter active motels, select dates, and choose time slots.
    *   [`app/book/`](file:///c:/Users/navth/merging/microstay/app/book/): Secure reservation flow validating room availability and booking details.
    *   [`app/api/`](file:///c:/Users/navth/merging/microstay/app/api/): Internal server routes, cron automated jobs, and webhook integrations.
*   [`components/`](file:///c:/Users/navth/merging/microstay/components/): UI components partitioned into admin dashboard, vendor portals, and public layout blocks.
*   [`lib/`](file:///c:/Users/navth/merging/microstay/lib/): Backend helper methods.
    *   [`lib/billing.ts`](file:///c:/Users/navth/merging/microstay/lib/billing.ts): Stripe invoice aggregates and local DB storage mapping.
    *   [`lib/stripe.ts`](file:///c:/Users/navth/merging/microstay/lib/stripe.ts): Stripe client wrapper, customer creations, and invoice finalization.
    *   [`lib/vendor-types.ts`](file:///c:/Users/navth/merging/microstay/lib/vendor-types.ts): TypeScript models and `calculateFees()` implementation.
    *   [`lib/agreement-text.ts`](file:///c:/Users/navth/merging/microstay/lib/agreement-text.ts): Canonical agreement text and version tags.
*   [`tests/`](file:///c:/Users/navth/merging/microstay/tests/): Playwright configuration and test specs.

---

## 4. Business Workflows & Billing Logic

1.  **Motel Onboarding**:
    *   Vendors fill out the partnership application, submit business licenses, and electronically sign the Partner Agreement.
    *   Admin reviews applications in the approval queue, enabling or suspending listings.
2.  **Booking Execution**:
    *   Guests search and book an available room slot. Room reservations default to `pending` status.
    *   Guests pay directly at the motel check-in desk.
3.  **Booking Reconciliation**:
    *   Vendors update pending bookings to `checked_in`, `no_show`, or `owner_cancel` on their dashboard.
    *   If a booking passes its slot end hour by more than 48 hours within the current month, it is auto-classified as `no_show` (with $0 platform fee) via the daily Commissions Cron.
    *   On the 1st of the next month, all remaining `pending` bookings from the previous month are automatically marked as `checked_in` (Vendor Liability).
4.  **Commission Billing Cycle**:
    *   **Platform Commission**: Strictly **12%** of gross booking revenue for checked-in stays.
    *   **Invoice Generation (1st)**: Auto-bills the prior calendar month's checked-in commission via Stripe.
    *   **Reminders**: Sent via email on the 5th (First Reminder) and 25th (Final Warning).
    *   **Deactivation (26th)**: Vendors with unpaid invoices are suspended from guest search results. Reinstatement requires paying all unpaid commission plus a **25% deactivation penalty**.
