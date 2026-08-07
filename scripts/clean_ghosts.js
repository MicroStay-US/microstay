const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase keys.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanData() {
  console.log('Initiating Ghost Data Cleanup...');
  
  // Keep sap250986@gmail.com (Motel 6)
  const targetEmail = 'sap250986@gmail.com';

  // 1. Delete all vendors that do NOT match this email
  console.log(`Deleting all vendors EXCEPT email: ${targetEmail}`);
  const { data: vendors, error: getErr } = await supabase.from('vendors').select('id, email, motel_name');
  if (vendors) {
    for (const v of vendors) {
      if (v.email !== targetEmail) {
        console.log(`Deleting vendor: ${v.email} (${v.motel_name})`);
        await supabase.from('vendors').delete().eq('id', v.id);
      }
    }
  }

  // 2. Clear out bookings/properties if any exist that do not belong to sap250986.
  // Actually, to be safe, delete properties not linked to the Motel 6
  const { data: motel6 } = await supabase.from('vendors').select('id').eq('email', targetEmail).single();
  
  if (motel6) {
    console.log(`Motel 6 Preserved ID: ${motel6.id}`);
    const { data: props } = await supabase.from('properties').select('id, vendor_id');
    if (props) {
      for (const p of props) {
        if (p.vendor_id !== motel6.id) {
          console.log(`Deleting property unrelated to Motel 6`);
          await supabase.from('properties').delete().eq('id', p.id);
        }
      }
    }
  }

  // 3. Clear ghost applications in vendor_applications
  console.log('Wiping legacy vendor_applications...');
  const { data: apps } = await supabase.from('vendor_applications').select('id');
  if (apps) {
     for (const a of apps) {
       await supabase.from('vendor_applications').delete().eq('id', a.id);
     }
  }

  console.log('Cleanup Complete! Sidebar counts should now be accurate to 1.');
}

cleanData();
