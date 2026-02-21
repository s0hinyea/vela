-- Vela: Add caregiver_pin + link profiles to Supabase Auth
-- Run this in Supabase SQL Editor
-- Person B's existing profiles table stays intact, we just add to it.

-- 1. Add caregiver_pin column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS caregiver_pin TEXT;

-- 2. Link profiles.id to auth.users so each profile is owned by an auth user
ALTER TABLE profiles
  ADD CONSTRAINT profiles_auth_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — users can only access their own data
-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Medications (via profile_id)
CREATE POLICY "Users can view own medications"
  ON medications FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert own medications"
  ON medications FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update own medications"
  ON medications FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete own medications"
  ON medications FOR DELETE USING (profile_id = auth.uid());

-- Dose logs (via profile_id)
CREATE POLICY "Users can view own dose logs"
  ON dose_logs FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert own dose logs"
  ON dose_logs FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update own dose logs"
  ON dose_logs FOR UPDATE USING (profile_id = auth.uid());
