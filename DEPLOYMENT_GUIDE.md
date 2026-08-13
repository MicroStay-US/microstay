# MicroStay Deployment & Domain Setup Guide

## Quick Start

Your MicroStay platform is ready for deployment! Follow these steps to get it live.

---

## 1. Domain Configuration

### Adding a Custom Domain

Your app will be automatically deployed. To add a custom domain (e.g., `microstay.us`):

#### Option A: Using Netlify (Recommended)

1. **Log into Netlify Dashboard**
   - Go to https://app.netlify.com
   - Find your MicroStay site

2. **Add Custom Domain**
   - Click "Domain settings"
   - Click "Add custom domain"
   - Enter your domain: `microstay.us`
   - Click "Verify"

3. **Configure DNS**

   **If using Netlify DNS (Easiest):**
   - Click "Use Netlify DNS"
   - Copy the 4 nameservers provided
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Update your domain's nameservers to use Netlify's nameservers
   - Wait 24-48 hours for DNS propagation

   **If using External DNS:**
   - Add an A record pointing to Netlify's load balancer:
     ```
     Type: A
     Name: @
     Value: 75.2.60.5
     ```
   - Add a CNAME record for www:
     ```
     Type: CNAME
     Name: www
     Value: your-site-name.netlify.app
     ```

4. **Enable HTTPS**
   - Netlify will automatically provision an SSL certificate
   - This usually takes 1-10 minutes

---

## 2. Testing Your Live Deployment

Once deployed, test the complete user flow:

### A. Customer Flow

1. **Search for Motels**
   - Go to homepage
   - Try searching by city name
   - Try "Find Nearby" (requires location permission)

2. **Make a Booking**
   - Select a motel from search results
   - Choose an available time slot
   - Fill in booking details
   - Get booking confirmation number

3. **Check Booking Status**
   - Click "Check Booking" in navigation
   - Enter booking number and last name
   - View booking details

### B. Vendor Flow

1. **Vendor Signup**
   - Click "Become a Partner"
   - Fill out application form
   - Upload required documents
   - Submit for approval

2. **Wait for Admin Approval**
   - Admin reviews application
   - Admin approves/rejects
   - Vendor receives email with temporary password

3. **Set Password**
   - Vendor logs in with temporary password
   - Sets permanent password
   - Access vendor dashboard

4. **Add Motel**
   - Go to vendor dashboard
   - Click "Add New Motel"
   - Fill in motel details (name, address, city, etc.)
   - Add amenities and photos
   - Save motel

5. **Manage Time Slots & Rates**
   - Click on motel in dashboard
   - Set up time slot templates
   - Set pricing for each slot
   - Configure available rooms

6. **Process Bookings**
   - View incoming bookings
   - Confirm customer check-ins
   - Mark no-shows if applicable
   - View revenue analytics

7. **Manage Team (Optional)**
   - Click "Team Management"
   - Add up to 3 team members
   - Assign permissions
   - Team members receive invitation emails

### C. Admin Flow

1. **Admin Login**
   - Only `adminmotel@gmail.com` and `manager@microstay.us`
   - Go to `/login`
   - Access admin dashboard

2. **Review Vendor Applications**
   - View all pending applications
   - Review business documents
   - Approve or reject with notes

3. **Monitor Platform**
   - View all bookings across platform
   - Track daily revenue
   - See profit breakdown (12% per booking)
   - View vendor performance
   - Monitor check-in rates

---

## 3. Creating Test Data

To test the system, create 4 dummy motels:

### Example Motel Data

**Motel 1: Downtown Express Inn**
- City: Los Angeles
- Address: 123 Main St, Los Angeles, CA 90001
- Latitude: 34.0522
- Longitude: -118.2437
- Phone: (555) 123-4567
- Amenities: WiFi, Parking, AC
- Price: $45/slot

**Motel 2: Airport Comfort Lodge**
- City: Los Angeles
- Address: 456 Airport Blvd, Los Angeles, CA 90045
- Latitude: 33.9416
- Longitude: -118.4085
- Phone: (555) 234-5678
- Amenities: WiFi, Parking, Shuttle
- Price: $55/slot

**Motel 3: Beach Side Rest**
- City: San Diego
- Address: 789 Ocean Ave, San Diego, CA 92101
- Latitude: 32.7157
- Longitude: -117.1611
- Phone: (555) 345-6789
- Amenities: WiFi, Beach Access, Parking
- Price: $60/slot

**Motel 4: Highway Haven**
- City: San Diego
- Address: 321 Highway 5, San Diego, CA 92154
- Latitude: 32.5702
- Longitude: -117.0092
- Phone: (555) 456-7890
- Amenities: WiFi, Parking, 24/7 Access
- Price: $40/slot

---

## 4. User Roles & Access

### Customer
- **Email**: Any email (no account needed for booking)
- **Access**: Search motels, make bookings, check booking status
- **Support**: support@microstay.us

### Vendor (Super Partner)
- **Email**: support@microstay.us (for support)
- **Access**: Full vendor dashboard, manage motels, team, bookings
- **Capabilities**:
  - Add/edit/delete motels
  - Configure time slots and pricing
  - View all bookings
  - Confirm check-ins and no-shows
  - Add up to 3 team members
  - View revenue analytics

### Vendor Team Member
- **Email**: support@microstay.us (for support)
- **Access**: Limited based on permissions
- **Capabilities** (if granted):
  - Manage time slots and rates
  - Confirm check-ins
  - Mark no-shows
  - Cancel bookings
- **Restrictions**:
  - Cannot add/remove team members
  - Cannot view full analytics

### Admin
- **Email**: adminmotel@gmail.com or manager@microstay.us
- **Access**: Full platform administration
- **Capabilities**:
  - Approve/reject vendor applications
  - View all bookings across platform
  - Monitor daily revenue
  - View profit calculations
  - Access all vendor data

---

## 5. Revenue Model

### Platform Fee Structure
For each booking:
- **Percentage Fee**: 12% of gross booking amount
- **Total Platform Fee**:  (12% × Gross Amount)

### Example Calculation
- Customer pays: $60.00
- Platform fee:  ($60.00 × 0.12) = $7.20
- Vendor receives: $60.00 - $7.20 = $52.80

This calculation happens automatically in the database for every booking.

---

## 6. Environment Variables

Your `.env` file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are already configured in your Netlify deployment.

---

## 7. Monitoring & Support

### For Customers
- **Email**: support@microstay.us
- **Response Time**: Within 24 hours
- **Issues**: Booking problems, cancellations, general inquiries

### For Vendors/Partners
- **Email**: support@microstay.us
- **Response Time**: Within 12 hours for critical issues
- **Issues**: Account help, property management, team management

### For Technical Issues
- **Email**: support@microstay.us
- **Issues**: Platform bugs, system errors, technical problems

---

## 8. Going Live Checklist

- [ ] Domain configured and SSL enabled
- [ ] Admin accounts created (adminmotel@gmail.com, manager@microstay.us)
- [ ] Test vendor application submission
- [ ] Test admin approval process
- [ ] Test vendor motel creation
- [ ] Test customer search (by city)
- [ ] Test customer search (nearby with geolocation)
- [ ] Test booking creation
- [ ] Test booking lookup
- [ ] Test vendor check-in process
- [ ] Verify profit calculations in admin dashboard
- [ ] Test team member invitations
- [ ] Verify email notifications
- [ ] Test on mobile devices
- [ ] Test all user roles and permissions

---

## 9. Troubleshooting

### Domain not working
- Wait 24-48 hours for DNS propagation
- Clear your browser cache
- Try accessing from incognito/private mode
- Verify DNS records using `nslookup microstay.us`

### SSL Certificate not provisioning
- Ensure DNS is properly configured
- Wait up to 24 hours
- Contact Netlify support if issue persists

### Database connection issues
- Verify Supabase environment variables
- Check Supabase dashboard for service status
- Review RLS policies if access is denied

### Booking not showing for vendor
- Verify motel ownership
- Check RLS policies
- Ensure vendor is approved and active

---

## Need Help?

Contact the technical team at support@microstay.us for any deployment or configuration assistance.
