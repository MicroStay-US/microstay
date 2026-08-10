# MicroStay Platform Features

## Overview
MicroStay is a comprehensive platform for hourly motel bookings with advanced partner management and team collaboration features.

---

## 1. Customer Support Contact

### Contact Information
- **Customer Support**: support@microstay.us
- **Partner/Vendor Support**: support@microstay.us

### Implementation
- Footer component with contact information on all pages
- Help widget available throughout the app
- Direct email links for quick support access

---

## 2. Admin Access Control

### Authorized Admin Emails
Only these two email addresses can access the admin dashboard:
- **admin@microstay.us** - Full access
- **manager@microstay.us** - Full access

### Security Features
- Email whitelist validation on admin dashboard access
- Automatic redirect for unauthorized emails
- Role-based access control
- Admin profile must have 'admin' role AND be in whitelist

### How It Works
1. User logs in with credentials
2. System checks if user has 'admin' role in profile
3. System validates email against whitelist
4. If not authorized, shows error and redirects to home
5. Only whitelisted admins can approve partners and access analytics

---

## 3. Vendor Team Management System

### Super Partner (Vendor Owner)
The main vendor account has full access as "Super Partner" including:
- Create, edit, delete motels
- Manage all bookings
- Add/remove team members (up to 3)
- View analytics and revenue
- Full control over all operations

### Team Members (Sub-Users)
Vendors can create up to 3 team member accounts with specific permissions:

#### Available Permissions
1. **Manage Time Slots** - Create, edit, delete available time windows
2. **Manage Rates** - Update pricing for rooms and time slots
3. **Confirm Check-in** - Mark customers as checked in
4. **Mark No-Show** - Mark bookings as no-show
5. **Cancel Bookings** - Cancel existing bookings

#### Team Member Features
- Each team member gets their own login credentials
- Must set their own password on first login (same as vendors)
- Can only access vendor dashboard, not team management
- Can only perform actions based on granted permissions
- Cannot add/remove other team members
- Cannot access financial analytics (vendor owner only)

### Team Management Interface
Located at `/vendor/team`, accessible only to super partners:

#### Add Team Member
1. Click "Add Team Member" button
2. Enter name and email
3. Select specific permissions
4. System creates account with temporary password
5. Super partner receives credentials to share
6. Team member must set new password on first login

#### Manage Team Members
- View all team members and their permissions
- Activate/deactivate team members
- Delete team members permanently
- See when each member was created
- Track active vs inactive members

#### Limitations
- Maximum 3 active team members per vendor
- Must deactivate existing member before adding 4th
- Deactivated members can be reactivated
- Only super partner can manage team

---

## 4. Vendor Approval Workflow

### For Partners
1. Visit website and click "Become a Partner"
2. Fill out detailed application with:
   - Business information
   - License details and upload
   - Contact information
   - Property photos
   - Sign agreement
3. Submit for review

### For Admins
1. Login at `/admin/dashboard`
2. Navigate to "Applications" tab
3. Review pending applications
4. Click "Approve" to create vendor account
5. System generates temporary password
6. Admin copies credentials and emails them to vendor

### For Approved Vendors
1. Receive email with:
   - Login email
   - Temporary password
2. Go to `/login` and sign in
3. Automatically redirected to `/set-password`
4. Create secure password meeting requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character
5. Redirected to vendor dashboard after password set

---

## 5. Database Schema

### New Tables

#### `vendor_team_members`
Stores information about vendor sub-users:
```sql
- id (uuid, primary key)
- vendor_id (uuid) - References the main vendor
- user_id (uuid) - References auth.users
- email (text)
- name (text)
- role (text) - 'vendor_team_member'
- permissions (jsonb) - Specific permissions object
- is_active (boolean)
- created_by (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### Updated Tables

**profiles**
- Added: `requires_password_reset` (boolean)
- Added: `vendor_team_member_id` (uuid, references vendor_team_members)

**vendor_applications**
- Added: `approved_by` (uuid)
- Added: `approved_at` (timestamptz)
- Added: `rejection_reason` (text)
- Added: `created_user_id` (uuid)
- Added: `temporary_password` (text)

### Row Level Security (RLS)

All tables have comprehensive RLS policies:
- Vendors can only see their own team members
- Team members can only see their own record
- Admins have full access
- Proper insert/update/delete restrictions

---

## 6. User Roles

### Customer
- Book motels by the hour
- Check bookings
- Contact support@microstay.us

### Vendor (Super Partner)
- Full access to all vendor features
- Manage properties and bookings
- Create and manage team members (up to 3)
- View analytics and revenue
- Contact support@microstay.us

### Vendor Team Member
- Limited access based on granted permissions
- Can manage time slots and rates (if permitted)
- Can confirm check-ins and no-shows (if permitted)
- Can cancel bookings (if permitted)
- Cannot add/remove team members
- Cannot view full analytics
- Contact support@microstay.us

### Admin
- Only admin@microstay.us and manager@microstay.us
- Approve/reject partner applications
- View all bookings and properties
- Access business analytics
- Manage platform operations

---

## 7. Key Features

### Security
- Email-based admin access control
- Row Level Security on all tables
- Password requirements enforcement
- Temporary passwords with forced reset
- Role-based permissions system

### User Experience
- Comprehensive footer with contact info
- Help widget throughout the app
- Clear user role indicators
- Intuitive team management interface
- Automatic redirects for first-time users

### Vendor Management
- Easy team member creation
- Granular permission control
- Up to 3 team members per vendor
- Activate/deactivate without deletion
- Visual permission indicators

### Admin Tools
- Pending applications dashboard
- One-click approval process
- Automatic account creation
- Temporary password generation
- Complete business analytics

---

## 8. Support Channels

### For Customers
- **Email**: support@microstay.us
- **Purpose**: Booking help, cancellations, general inquiries
- **Response Time**: Within 24 hours

### For Partners/Vendors
- **Email**: support@microstay.us
- **Purpose**: Account help, property management, team issues
- **Response Time**: Within 12 hours for critical issues

---

## 9. Technical Implementation

### Frontend
- Next.js 13 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/ui component library
- Client-side state management

### Backend
- Supabase for database and auth
- PostgreSQL with RLS
- Real-time subscriptions
- Server-side API routes

### Authentication
- Supabase Auth
- Email/password authentication
- Temporary password system
- Password reset on first login
- Session management

---

## 10. Testing Checklist

### Customer Flow
- [ ] Search for motels
- [ ] Book a motel
- [ ] Check booking status
- [ ] Contact support

### Vendor Flow
- [ ] Apply as partner
- [ ] Receive approval email
- [ ] Login with temporary password
- [ ] Set new password
- [ ] Create motel
- [ ] Add team members
- [ ] Manage bookings

### Team Member Flow
- [ ] Receive credentials from super partner
- [ ] Login with temporary password
- [ ] Set new password
- [ ] Access vendor dashboard
- [ ] Perform permitted actions only

### Admin Flow
- [ ] Login as admin@microstay.us or manager@microstay.us
- [ ] Review pending applications
- [ ] Approve vendor
- [ ] View analytics
- [ ] Verify access restriction for other emails

---

## Support & Maintenance

### Contact Information
- **Customer Support**: support@microstay.us
- **Partner/Vendor Support**: support@microstay.us
- **Technical Issues**: support@microstay.us

### Documentation
- All features documented in this file
- Database schema documented in migrations
- Code comments for complex logic
- Type definitions for all entities
