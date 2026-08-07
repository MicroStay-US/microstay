import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local or fallback to .env.test.example just to see if it has the keys
let envContent = '';
try {
  envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
} catch (e) {
  try {
    envContent = fs.readFileSync(path.join(process.cwd(), '.env.test.example'), 'utf-8');
  } catch (e2) {
    console.log("No env file found");
  }
}

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.log("Missing credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('vendors')
    .select('email, status, business_name');
  
  if (error) console.error("Database Error:", error);
  console.log("ALL VENDORS:", JSON.stringify(data, null, 2));
}

check();
