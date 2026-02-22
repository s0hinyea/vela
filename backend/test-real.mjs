import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // Find a profile with medications
    const { data: meds } = await supabase.from('medications').select('profile_id').limit(1);

    if (!meds || meds.length === 0) {
      console.log('No medications found in db');
      return;
    }
    const profileId = meds[0].profile_id;
    console.log('Testing with profileId:', profileId);

    const res = await fetch('http://localhost:3000/api/schedule/demo-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, timeZone: 'America/New_York' })
    });

    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (err) {
    console.error(err);
  }
}
run();
