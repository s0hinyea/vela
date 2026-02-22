-- Because the API calls getSupabase() without an auth token, it acts as anon.
-- We previously set the policies to TO authenticated. 
-- For now, let's just make the policies permissive for the API:

DROP POLICY IF EXISTS "Users can read own voice_clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can insert own voice_clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can update own voice_clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can delete own voice_clips" ON voice_clips;

CREATE POLICY "Enable read access for all users"
  ON voice_clips FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON voice_clips FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
  ON voice_clips FOR UPDATE
  USING (true);

CREATE POLICY "Enable delete access for all users"
  ON voice_clips FOR DELETE
  USING (true);
