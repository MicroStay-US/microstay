# VERCEL DOMAIN SETUP GUIDE

## Step 1: Access Your Vercel Project
1. Go to: https://vercel.com/dashboard
2. Find your project: **micro-stay-bolt**
3. Click on it

## Step 2: Go to Settings
1. Click "Settings" tab (top navigation)
2. Click "Domains" in the left sidebar

## Step 3: Add Your Custom Domain
1. You'll see a box that says "Add Domain"
2. Type your domain (example: **microstay.com** or **www.microstay.com**)
3. Click "Add"

## Step 4: Configure DNS (At Your Domain Provider)
Vercel will show you DNS records to add. You have 2 options:

### Option A: Point to Vercel (Recommended)
Add these records at your domain registrar (GoDaddy, Namecheap, etc.):

**For Root Domain (microstay.com):**
- Type: A
- Name: @
- Value: 76.76.21.21

**For WWW (www.microstay.com):**
- Type: CNAME
- Name: www
- Value: cname.vercel-dns.com

### Option B: Use Vercel Nameservers (Easiest)
If Vercel offers nameservers, use them:
1. Copy the nameservers from Vercel
2. Go to your domain registrar
3. Replace existing nameservers with Vercel's

## Step 5: Wait for DNS Propagation
- Takes 5-60 minutes (usually ~15 minutes)
- Vercel will auto-detect when ready
- You'll see a green checkmark when live

## Step 6: Enable HTTPS (Automatic)
- Vercel automatically provisions SSL certificate
- Takes 1-2 minutes after DNS is verified
- Your site will be accessible via https://yourdomain.com

## Current Deployment
Your app is currently at: **https://micro-stay-bolt.vercel.app**
- This will continue working even after adding custom domain
- You can have both URLs active

## Environment Variables Already Set
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
(No changes needed for domain)

## Test Real-Time Flow After Domain Setup
1. Go to your new domain
2. Test booking flow:
   - Search for motels
   - Make a booking
   - Check confirmation
3. Test vendor dashboard:
   - Login as vendor
   - View bookings
   - Check billing tab
4. Test admin dashboard:
   - Login as admin
   - View all bookings
   - Check monthly invoices

DONE!
