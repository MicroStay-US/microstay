# MicroStay Monthly Billing System

## Overview

The MicroStay platform uses a **monthly billing system** where vendors collect full payment from customers and are billed monthly for platform fees.

---

## How It Works

### For Vendors

1. **Collect Full Payment**
   - Vendors receive 100% of the booking amount from customers
   - No upfront deductions or splits

2. **Monthly Invoicing**
   - Platform fees are calculated monthly
   - Invoices generated automatically on the 1st of each month
   - Covers all checked-in bookings from the previous month

3. **Platform Fee Structure**
   - **Percentage Fee**: 12% of gross booking amount
   - **Formula**:  (Gross Amount × 0.12)

4. **Payment Timeline**
   - **1st of month**: Invoice generated
   - **5th of month**: Automated reminder sent if unpaid
   - **7th of month**: Properties automatically disabled if still unpaid
   - **After payment**: Admin marks as paid → properties reactivated

---

## Example Calculation

```
Customer books room for: $60.00
Vendor collects: $60.00

Platform fee calculation:
- Percentage fee: $60.00 × 0.12 = $7.20
- Total platform fee:  $7.20

Vendor keeps: $60.00 (collected from customer)
Vendor owes: $7.20 (paid monthly to platform)
```

---

## Monthly Invoice Flow

### Step 1: Invoice Generation (1st of Month)

**Automated Process:**
- System calculates all checked-in bookings from previous month
- Generates invoice for each vendor with bookings
- Invoice includes:
  - Invoice number (e.g., INV-202603-1234)
  - Billing period (e.g., Feb 1 - Feb 28, 2026)
  - Number of bookings
  - Total revenue collected by vendor
  - Platform fees owed
  - Due date (7 days after month end)

**Admin Action:**
- Click "Generate Monthly Invoices" button in admin dashboard
- System automatically generates for all vendors

### Step 2: Payment Reminder (5th of Month)

**Automated Process:**
- System checks for unpaid invoices
- Sends reminder notifications to vendors
- Updates invoice status to show reminder sent
- No properties affected yet

### Step 3: Auto-Disable (7th of Month)

**Automated Process:**
- System checks for invoices still unpaid
- Automatically disables all properties for vendors with unpaid invoices
- Updates invoice status to "overdue"
- Vendor billing status changed to "suspended"
- Properties no longer appear in customer searches

**Impact on Vendor:**
- Cannot accept new bookings
- Existing bookings still honored
- Must pay invoice to reactivate

### Step 4: Payment Confirmation

**Manual Process (Admin):**
1. Vendor sends payment proof to admin
2. Admin reviews payment proof
3. Admin enters payment proof URL in system
4. Admin clicks "Mark as Paid"
5. System automatically:
   - Updates invoice to "paid" status
   - Reactivates all vendor properties
   - Changes billing status back to "current"
   - Records admin who confirmed payment

---

## Admin Dashboard Features

### Invoices Tab

**View All Invoices:**
- Invoice number
- Vendor name
- Billing period
- Number of bookings
- Gross revenue collected
- Platform fees owed
- Due date
- Payment status
- Actions

**Actions:**
- Generate monthly invoices (bulk)
- Mark individual invoice as paid
- View payment proof
- Track reminder dates
- Monitor auto-disable dates

**Automated Schedule Display:**
```
1st of month: Invoices auto-generated for previous month
5th of month: Reminder sent to vendors with unpaid invoices
7th of month: Properties auto-disabled if invoice still unpaid
Payment: Admin marks as paid after receiving proof - properties reactivated
```

---

## Vendor Dashboard Features

### Billing Tab

**View Monthly Invoices:**
- All invoices for vendor
- Payment status indicators
- Due dates with reminders
- Total amount due
- Revenue collected vs fees owed

**Billing Information Display:**
```
How Billing Works:
✓ You collect: Full payment amount from customers
✓ Platform fee:  12% of gross booking amount (billed monthly)
✓ Due date: 7 days after month ends
✓ Payment: Send proof to admin for manual confirmation
⚠ Important: Properties auto-disabled on 7th if invoice unpaid
```

**Status Indicators:**
- ✅ **Paid**: Invoice settled, all good
- ⏳ **Pending Payment**: Awaiting payment
- 🔴 **Overdue - Properties Disabled**: Payment late, properties offline

---

## Database Functions

### generate_monthly_invoice(vendor_id, billing_month)

**Purpose**: Create monthly invoice for a vendor

**Logic:**
1. Calculate billing period (previous month)
2. Query all checked-in bookings in period
3. Calculate platform fees: SUM( gross × 0.12)
4. Create invoice with 7-day due date
5. Return invoice ID

**Usage:**
```sql
SELECT generate_monthly_invoice(
  'vendor-uuid-here',
  '2026-03-01'::date
);
```

### process_invoice_reminders()

**Purpose**: Daily job to process automated actions

**Logic:**
- On 5th: Send reminders for unpaid invoices
- On 7th: Disable properties for unpaid invoices

**Usage:**
```sql
SELECT process_invoice_reminders();
```

### mark_invoice_paid(invoice_id, proof_url, admin_id)

**Purpose**: Manually mark invoice as paid

**Logic:**
1. Update invoice to paid status
2. Store payment proof URL
3. Record admin who confirmed
4. Reactivate all vendor properties
5. Update vendor billing status

**Usage:**
```sql
SELECT mark_invoice_paid(
  'invoice-uuid',
  'https://example.com/proof.pdf',
  'admin-uuid'
);
```

---

## Testing the System

### Test Scenario 1: Normal Payment Flow

1. **Setup**: Create vendor with bookings last month
2. **Day 1**: Admin generates invoices
3. **Day 2-4**: Vendor reviews invoice
4. **Day 5**: Vendor sends payment proof to admin
5. **Day 6**: Admin marks as paid
6. **Result**: Properties stay active, status = "paid"

### Test Scenario 2: Late Payment

1. **Setup**: Create vendor with bookings last month
2. **Day 1**: Admin generates invoices
3. **Day 5**: System sends reminder
4. **Day 7**: System auto-disables properties
5. **Day 10**: Vendor sends payment
6. **Day 11**: Admin marks as paid, properties reactivated
7. **Result**: Properties back online, status = "paid"

### Test Scenario 3: Multiple Invoices

1. **Setup**: Vendor has multiple unpaid invoices
2. **Admin**: Mark oldest invoice as paid first
3. **Check**: Properties remain disabled until ALL overdue invoices paid
4. **Admin**: Mark remaining invoices as paid
5. **Result**: Properties reactivated

---

## Payment Proof Guidelines

**Acceptable Proof Documents:**
- Bank transfer receipts
- Payment confirmation screenshots
- Wire transfer confirmations
- Check images
- PayPal/payment processor receipts

**Storage:**
- Upload to secure file storage (e.g., AWS S3, Google Drive)
- Generate shareable link
- Paste link in admin dashboard
- System stores link with invoice

---

## Monitoring & Reports

### Admin Can View:

1. **Outstanding Invoices**
   - Total amount owed across all vendors
   - Number of unpaid invoices
   - Vendors at risk of suspension

2. **Payment History**
   - All paid invoices
   - Payment dates
   - Payment proof links
   - Admin who confirmed

3. **Vendor Status**
   - Current: All bills paid
   - Overdue: Has unpaid invoices
   - Suspended: Properties disabled

---

## Important Notes

### For Vendors:
- Always collect full payment from customers
- Monitor billing tab regularly
- Pay invoices before 7th to avoid property suspension
- Keep payment receipts for records
- Contact support@microstay.us for billing questions

### For Admins:
- Generate invoices on 1st of each month
- Verify payment proofs before marking paid
- Keep payment proof links accessible
- Monitor vendor billing status
- System handles reminders and auto-disable automatically

---

## Differences from Previous System

### Old System (Real-time Split):
- Platform fee deducted immediately
- Vendor received: Gross - Platform Fee
- Instant settlements
- No monthly billing

### New System (Monthly Billing):
- Vendor collects full amount
- Platform bills monthly
- Vendor pays accumulated fees
- Automated enforcement
- Better cash flow for vendors

---

## Automation Schedule

| Day | Action | System/Manual |
|-----|--------|---------------|
| 1st | Generate monthly invoices | System (Admin triggers) |
| 5th | Send payment reminders | System (Automatic) |
| 7th | Disable unpaid properties | System (Automatic) |
| Any | Mark invoice as paid | Manual (Admin) |
| Any | Properties reactivated | System (After payment) |

---

## Support Contacts

- **Vendor Billing Questions**: support@microstay.us
- **Admin Support**: adminmotel@gmail.com
- **Technical Issues**: support@microstay.us

---

## Database Schema

### motel_invoices Table:
```sql
- id (uuid)
- invoice_number (text, unique)
- vendor_id (uuid, FK)
- billing_period_start (date)
- billing_period_end (date)
- total_bookings (int)
- gross_revenue (numeric)
- platform_fees (numeric)
- payment_status (pending/paid/overdue)
- due_date (date)
- paid_date (date, nullable)
- reminder_sent_date (timestamptz, nullable)
- payment_proof_url (text, nullable)
- auto_disabled_date (timestamptz, nullable)
- paid_by_admin_id (uuid, FK, nullable)
- notes (text)
```

### profiles Table (Vendor Billing Fields):
```sql
- billing_status (current/overdue/suspended)
- last_billing_action_date (timestamptz)
```

---

This billing system ensures fair, transparent, and automated monthly billing while giving vendors better cash flow and the platform reliable revenue collection.
