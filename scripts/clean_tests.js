const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function clean() {
  try {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const getVal = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();
    
    const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
    const key = getVal('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      console.error('Could not parse env');
      return;
    }

    const supabase = createClient(url, key);

    // Get all Motel 6 properties
    const { data: properties } = await supabase.from('properties').select('id').eq('name', 'Motel 6');
    if (!properties || properties.length === 0) {
      console.log('No Motel 6 properties found');
      return;
    }

    const ids = properties.map(p => p.id);
    console.log(`Found ${ids.length} Motel 6 properties to delete.`);

    // 1. Delete associated bookings
    const { error: err1 } = await supabase.from('vd_bookings').delete().in('property_id', ids);
    if (err1) console.log('Booking delete err:', err1);

    // 2. Delete time slots (should cascade but just in case)
    await supabase.from('vd_time_slots').delete().in('property_id', ids);

    // 3. Delete from properties
    const { error: err3 } = await supabase.from('properties').delete().in('id', ids);
    if (err3) console.log('Property delete err:', err3)
    else console.log('Successfully wiped old Motel 6 test data!');
    
  } catch (e) {
    console.error(e);
  }
}

clean();
