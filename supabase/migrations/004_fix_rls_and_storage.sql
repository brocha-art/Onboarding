-- ============================================================
-- Migration 004: Fix infinite recursion in RLS + storage policies
-- Run in Supabase SQL editor
-- ============================================================

-- ── Fix 1: SECURITY DEFINER function to check admin role ──────────────────
-- This bypasses RLS when querying profiles internally, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Fix 2: Drop all recursive/conflicting policies ────────────────────────
DROP POLICY IF EXISTS "profiles_self_read"         ON profiles;
DROP POLICY IF EXISTS "profiles_service_all"        ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read"         ON profiles;
DROP POLICY IF EXISTS "submissions_self_read"        ON submissions;
DROP POLICY IF EXISTS "submissions_admin_read"       ON submissions;
DROP POLICY IF EXISTS "submissions_admin_update"     ON submissions;
DROP POLICY IF EXISTS "submissions_self_insert"      ON submissions;

-- ── Fix 3: Recreate profiles policies (no recursion) ─────────────────────
-- Users can read their own profile row
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role bypass (for server-side admin assignment)
CREATE POLICY "profiles_service_all" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Admins can read ALL profiles — uses SECURITY DEFINER fn to avoid recursion
CREATE POLICY "profiles_admin_read" ON profiles
  FOR SELECT USING (public.is_admin());

-- ── Fix 4: Recreate submissions policies ─────────────────────────────────
-- Artists can read their own submissions
CREATE POLICY "submissions_self_read" ON submissions
  FOR SELECT USING (auth.uid() = artist_id);

-- Artists can insert their own submission
CREATE POLICY "submissions_self_insert" ON submissions
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

-- Admins can read ALL submissions
CREATE POLICY "submissions_admin_read" ON submissions
  FOR SELECT USING (public.is_admin());

-- Admins can update submissions (approve/reject)
CREATE POLICY "submissions_admin_update" ON submissions
  FOR UPDATE USING (public.is_admin());

-- ── Fix 5: Storage policies for private buckets ───────────────────────────
-- Ensure buckets exist (non-public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-videos', 'session-videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Drop stale storage policies if they exist
DROP POLICY IF EXISTS "session_videos_insert" ON storage.objects;
DROP POLICY IF EXISTS "session_videos_select" ON storage.objects;
DROP POLICY IF EXISTS "resources_insert"       ON storage.objects;
DROP POLICY IF EXISTS "resources_select"       ON storage.objects;

-- session-videos: authenticated users can upload and read
CREATE POLICY "session_videos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'session-videos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "session_videos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'session-videos' AND auth.role() = 'authenticated'
  );

-- resources: authenticated users can upload and read
CREATE POLICY "resources_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resources' AND auth.role() = 'authenticated'
  );

CREATE POLICY "resources_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resources' AND auth.role() = 'authenticated'
  );

-- ── Done ──────────────────────────────────────────────────────────────────
-- After running this, re-insert admin user if needed:
-- INSERT INTO profiles (id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'hdgarzon3@outlook.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
