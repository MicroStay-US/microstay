# GITHUB UPDATE GUIDE - Get Latest Code Live!

## Problem:
- Bolt.new has latest code
- GitHub has old code (3 hours ago)
- Vercel deploys from GitHub, so it's also old

## Solution: Update These 3 Files on GitHub

---

## FILE 1: Admin Dashboard

**GitHub URL:** https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/admin/dashboard/page.tsx

**Steps:**
1. Click the URL above
2. Click the "Edit" button (pencil icon, top right)
3. Select ALL content (Ctrl+A) and DELETE it
4. Go to Bolt.new and open: `UPLOAD_FILES/admin-dashboard-page.tsx`
5. Copy ALL content from that file
6. Paste into GitHub editor
7. Scroll to bottom, click "Commit changes"
8. Click "Commit changes" again in popup

---

## FILE 2: Vendor Dashboard

**GitHub URL:** https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/vendor/dashboard/page.tsx

**Steps:**
1. Click the URL above
2. Click the "Edit" button (pencil icon, top right)
3. Select ALL content (Ctrl+A) and DELETE it
4. Go to Bolt.new and open: `UPLOAD_FILES/vendor-dashboard-page.tsx`
5. Copy ALL content from that file
6. Paste into GitHub editor
7. Scroll to bottom, click "Commit changes"
8. Click "Commit changes" again in popup

---

## FILE 3: Billing System Documentation (NEW FILE)

**GitHub URL:** https://github.com/MicroStay/MicroStay_Bolt

**Steps:**
1. Go to main repository page (URL above)
2. Click "Add file" button (top right)
3. Select "Create new file"
4. Name the file: `BILLING_SYSTEM.md`
5. Go to Bolt.new and open: `UPLOAD_FILES/BILLING_SYSTEM.md`
6. Copy ALL content from that file
7. Paste into GitHub editor
8. Scroll to bottom, click "Commit new file"

---

## After Updating All 3 Files:

### Wait for Vercel to Deploy (2-3 minutes)
1. Go to: https://vercel.com/micro-stay-bolt
2. Watch for new deployment to start
3. Wait for "Ready" status
4. Click on the deployment to see the new URL

### Test Your Updated Site
Go to: https://micro-stay-bolt.vercel.app

**What You Should See:**
- Admin Dashboard: New "Monthly Invoices" tab
- Vendor Dashboard: New "Billing" tab
- All booking flow working
- Updated UI/design

---

## Quick Copy-Paste URLs:

**GitHub Files to Edit:**
1. https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/admin/dashboard/page.tsx
2. https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/vendor/dashboard/page.tsx

**Bolt.new Files to Copy From:**
1. UPLOAD_FILES/admin-dashboard-page.tsx
2. UPLOAD_FILES/vendor-dashboard-page.tsx
3. UPLOAD_FILES/BILLING_SYSTEM.md

**Vercel Deployment:**
- https://vercel.com (check deployment status)

---

## Expected Timeline:
- Updating GitHub files: 5 minutes
- Vercel auto-deploy: 2-3 minutes
- Total: ~8 minutes

## Troubleshooting:

**If Vercel doesn't auto-deploy:**
1. Go to Vercel dashboard
2. Click your project
3. Click "Deployments" tab
4. Click "Redeploy" on latest deployment

**If you don't see UPLOAD_FILES folder in Bolt:**
- Files are in: `/UPLOAD_FILES/` (root directory)
- Scroll down in file tree to find it

---

DONE! Your live site will match your Bolt.new version.
