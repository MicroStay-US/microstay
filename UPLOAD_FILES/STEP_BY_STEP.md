# Step-by-Step GitHub Update Guide

## Prerequisites
- ✅ Database migration completed
- ✅ Files ready in UPLOAD_FILES folder
- 📁 GitHub account logged in

---

## File 1: Admin Dashboard

### Step 1.1: Navigate to File
```
https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/admin/dashboard/page.tsx
```

### Step 1.2: Edit File
- Click the **pencil icon** (✏️) in the top right
- OR click "Edit this file" button

### Step 1.3: Replace Content
1. Select all text: `Ctrl+A` (Windows) or `Cmd+A` (Mac)
2. Delete all content
3. Open `admin-dashboard-page.tsx` from UPLOAD_FILES
4. Copy ALL content: `Ctrl+A` then `Ctrl+C`
5. Return to GitHub tab
6. Paste: `Ctrl+V` or `Cmd+V`

### Step 1.4: Commit Changes
1. Scroll to bottom of page
2. In "Commit message" box, enter:
   ```
   Add monthly billing invoice management to admin dashboard
   ```
3. Click green **"Commit changes"** button

### ✅ Done! File 1 complete

---

## File 2: Vendor Dashboard

### Step 2.1: Navigate to File
```
https://github.com/MicroStay/MicroStay_Bolt/blob/main/app/vendor/dashboard/page.tsx
```

### Step 2.2: Edit File
- Click the **pencil icon** (✏️) in the top right

### Step 2.3: Replace Content
1. Select all text: `Ctrl+A` (Windows) or `Cmd+A` (Mac)
2. Delete all content
3. Open `vendor-dashboard-page.tsx` from UPLOAD_FILES
4. Copy ALL content: `Ctrl+A` then `Ctrl+C`
5. Return to GitHub tab
6. Paste: `Ctrl+V` or `Cmd+V`

### Step 2.4: Commit Changes
1. Scroll to bottom of page
2. In "Commit message" box, enter:
   ```
   Add monthly billing tab to vendor dashboard
   ```
3. Click green **"Commit changes"** button

### ✅ Done! File 2 complete

---

## File 3: Billing Documentation (NEW FILE)

### Step 3.1: Navigate to Repository Root
```
https://github.com/MicroStay/MicroStay_Bolt
```

### Step 3.2: Create New File
1. Click **"Add file"** button (top right)
2. Select **"Create new file"** from dropdown

### Step 3.3: Name the File
In the "Name your file..." box at top, type:
```
BILLING_SYSTEM.md
```

### Step 3.4: Add Content
1. Open `BILLING_SYSTEM.md` from UPLOAD_FILES
2. Copy ALL content: `Ctrl+A` then `Ctrl+C`
3. Return to GitHub tab
4. Click in the large text area
5. Paste: `Ctrl+V` or `Cmd+V`

### Step 3.5: Commit New File
1. Scroll to bottom of page
2. In "Commit message" box, enter:
   ```
   Add comprehensive billing system documentation
   ```
3. Click green **"Commit new file"** button

### ✅ Done! File 3 complete

---

## Verification

### Check Vercel Deployment

1. Go to Vercel dashboard:
   ```
   https://vercel.com/info-43850757s-projects/micro-stay-bolt/deployments
   ```

2. You should see a new deployment in progress
   - Status: "Building..." → "Ready"
   - Takes 2-3 minutes

3. Wait for "Ready" status with ✓ checkmark

### Test Admin Dashboard

1. Go to your live site: `https://micro-stay-bolt.vercel.app`
2. Login with admin credentials
3. Navigate to Admin Dashboard
4. **Look for new tab**: "Monthly Invoices" (should be first tab)
5. Click it - you should see:
   - "Generate Monthly Invoices" button
   - Table with invoice columns
   - Yellow box with automated billing schedule

### Test Vendor Dashboard

1. Login as a vendor (or create test vendor)
2. Navigate to Vendor Dashboard
3. **Look for new tab**: "Billing"
4. Click it - you should see:
   - Blue information box explaining billing
   - "No invoices yet" message (if no invoices generated)
   - Table structure ready for invoices

---

## Troubleshooting

### Issue: Tab not showing
- **Solution**: Clear browser cache (Ctrl+Shift+Del)
- **Solution**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- **Solution**: Wait for Vercel deployment to complete

### Issue: Deployment failed
- **Solution**: Check GitHub commits went through
- **Solution**: Check for TypeScript errors in Vercel logs
- **Solution**: Verify you copied files completely

### Issue: JavaScript errors
- **Solution**: Open browser console (F12)
- **Solution**: Check for missing imports or syntax errors
- **Solution**: Verify all three files were uploaded

---

## What You Just Updated

### ✅ Admin Dashboard
- Added complete invoice management system
- Generate monthly invoices for all vendors
- Mark invoices as paid with proof tracking
- View payment status and reminder dates
- Track auto-disable actions

### ✅ Vendor Dashboard
- Added billing transparency
- Vendors can see their monthly invoices
- Clear payment status indicators
- Explanation of billing process
- Total amount due tracker

### ✅ Documentation
- Complete billing system guide
- How it works for vendors and admins
- Example calculations
- Testing scenarios
- Database schema reference

---

## Next Steps

1. **Test Invoice Generation**
   - Login as admin
   - Click "Generate Monthly Invoices"
   - Check if invoices appear

2. **Review Documentation**
   - Read `BILLING_SYSTEM.md` on GitHub
   - Understand the automated timeline
   - Plan for 1st-of-month invoice generation

3. **Set Calendar Reminders**
   - 1st of month: Generate invoices
   - Monitor payment status throughout month

---

## Success!

Your GitHub repository is now updated with the monthly billing system!

The changes will automatically deploy to your live site in 2-3 minutes.

🎉 All done!
