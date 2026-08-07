# GitHub Update Instructions - Fee Structure Changes

All references to "15% platform fee" and "keep 85%" have been removed and replaced with the correct fee structure: **$5 flat + 8% of gross booking revenue**.

## Files Modified

### 1. `/app/partner/page.tsx`
**Lines changed:**
- Line 34-35: Changed "Keep 85% of every booking, with only a 15% platform fee" to "Simple transparent pricing with a flat  12% per booking"
- Line 160: Changed "Platform fee: 15% per booking (you keep 85%)" to "Monthly platform fee: 12% of gross booking revenue"

### 2. `/app/book/[id]/page.tsx`
**Line changed:**
- Line 90: Changed `const platformFee = totalPrice * 0.15;` to `const platformFee = (totalPrice * 0.12);`

### 3. `/supabase/migrations/20260321214856_add_business_analytics_schema.sql`
**Line changed:**
- Line 28: Changed "Platform takes 15% commission on each booking" to "Platform charges 12% of gross booking revenue"

## How to Apply These Changes to GitHub

1. Go to each file listed above in your GitHub repository
2. Click the pencil icon (Edit) on each file
3. Make the exact changes noted above
4. Commit each change with a message like: "Update platform fee structure to 12%"
5. After all files are updated, Vercel will automatically redeploy

## Verification

After deployment, verify:
- Partner page (https://microstay.us/partner) shows correct fee structure
- Booking calculations use 12% formula
- No mentions of "15%" or "85%" remain in the codebase
