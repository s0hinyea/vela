import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve('.env.local');
const envLocal = fs.readFileSync(envLocalPath, 'utf8');

const SUPABASE_URL = envLocal.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const SUPABASE_SERVICE_KEY = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || '';

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.from('dose_logs').select('id, profile_id, medication_id, scheduled_time, date').limit(1);
  console.log("Data:", data, "Error:", error);
}
run();
