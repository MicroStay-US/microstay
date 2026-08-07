import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'microstay-auth',
  },
});
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true,
//     storageKey: 'microstay-auth',
//   },
// });

export type Profile = {
  id: string;
  role: 'customer' | 'vendor' | 'admin' | 'manager' | 'support';
  name: string | null;
  phone: string | null;
  created_at: string;
  requires_password_reset?: boolean;
};

export type Motel = {
  id: string;
  vendor_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  description: string | null;
  amenities: string[];
  images: string[];
  phone: string;
  active: boolean;
  created_at: string;
};

export type Room = {
  id: string;
  motel_id: string;
  room_type: 'single' | 'double' | 'suite';
  price_per_slot: number;
  active: boolean;
  created_at: string;
};

export type TimeSlot = {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  booking_id: string;
  user_id: string | null;
  motel_id: string;
  room_id: string;
  time_slot_id: string;
  booking_date: string;
  last_name: string;
  phone: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
};

export type VendorApplication = {
  id: string;
  motel_name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
