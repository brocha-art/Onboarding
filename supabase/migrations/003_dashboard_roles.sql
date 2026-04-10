-- ============================================================
-- Migration 003: Dashboard roles + submission status
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Add extra columns to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'published', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- 2. Profiles table (role per user)
CREATE TABLE IF NOT EXISTS profiles (
  id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL DEFAULT 'artist' CHECK (role IN ('artist', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY IF NOT EXISTS "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role can do everything (for admin assignment via backend)
CREATE POLICY IF NOT EXISTS "profiles_service_all" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Admins can read all profiles
CREATE POLICY IF NOT EXISTS "profiles_admin_read" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 3. Let admins read all submissions
CREATE POLICY IF NOT EXISTS "submissions_admin_read" ON submissions
  FOR SELECT USING (
    auth.uid() = artist_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 4. Let admins update submissions (approve/reject)
CREATE POLICY IF NOT EXISTS "submissions_admin_update" ON submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 5. Artists can only update price/description on their own approved submissions
-- (enforced at app level — no separate policy needed beyond existing artist rls)

-- ============================================================
-- To make a user admin, run:
-- INSERT INTO profiles (id, role) VALUES ('<user-uuid>', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
-- ============================================================
