-- ============================================================
-- Brocha Artist Portal — Supabase Schema v2
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Artists — id = auth.users.id (1:1 with Supabase Auth)
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  bio TEXT DEFAULT '',
  profile_photo_url TEXT,
  instagram TEXT DEFAULT '',
  website TEXT DEFAULT '',
  sections TEXT[] DEFAULT '{}',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Submissions (review queue)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products (Tienda)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Obra original',
  technique TEXT DEFAULT '',
  year TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  stock INTEGER,
  shipping_option TEXT DEFAULT '',
  shipping_countries TEXT[] DEFAULT '{}',
  shipping_policy TEXT DEFAULT '',
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Studios (Estudios)
CREATE TABLE IF NOT EXISTS studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  cover_url TEXT,
  promo_video_url TEXT,
  -- HLS fields (populated after transcoding Edge Function runs)
  promo_hls_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_url TEXT,          -- original upload path
  hls_url TEXT,            -- m3u8 playlist URL (set by Edge Function after transcoding)
  hls_status TEXT DEFAULT 'pending' CHECK (hls_status IN ('pending', 'processing', 'ready', 'error')),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Otro',
  url TEXT DEFAULT '',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-photos', 'profile-photos', true),
  ('product-images', 'product-images', true),
  ('studio-covers', 'studio-covers', true),
  ('studio-videos', 'studio-videos', true),
  ('session-videos', 'session-videos', false),
  ('hls-videos', 'hls-videos', true),
  ('resources', 'resources', false),
  ('raw-videos', 'raw-videos', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage Policies
-- ============================================================

-- profile-photos (public read, auth upload)
CREATE POLICY "auth upload profile-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "public read profile-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

-- product-images
CREATE POLICY "auth upload product-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "public read product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- studio-covers
CREATE POLICY "auth upload studio-covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'studio-covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "public read studio-covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'studio-covers');

-- studio-videos
CREATE POLICY "auth upload studio-videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'studio-videos' AND auth.uid() IS NOT NULL);
CREATE POLICY "public read studio-videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'studio-videos');

-- hls-videos (public — served to external players)
CREATE POLICY "service upload hls-videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hls-videos');
CREATE POLICY "public read hls-videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'hls-videos');

-- session-videos (private — only owner can upload)
CREATE POLICY "auth upload session-videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-videos' AND auth.uid() IS NOT NULL);

-- raw-videos (private — input for transcoding)
CREATE POLICY "auth upload raw-videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'raw-videos' AND auth.uid() IS NOT NULL);

-- resources (private)
CREATE POLICY "auth upload resources" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

-- ============================================================
-- RLS — Enable on all tables
-- ============================================================
ALTER TABLE artists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE studios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources   ENABLE ROW LEVEL SECURITY;

-- Artists: each user manages only their own row
CREATE POLICY "artist can insert own row"  ON artists FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "artist can read own row"    ON artists FOR SELECT USING (id = auth.uid());
CREATE POLICY "artist can update own row"  ON artists FOR UPDATE USING (id = auth.uid());

-- Submissions: artist can insert + read their own
CREATE POLICY "artist insert submission"   ON submissions FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "artist read submission"     ON submissions FOR SELECT USING (artist_id = auth.uid());

-- Products: scoped to artist_id = auth.uid()
CREATE POLICY "artist insert products"     ON products FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "artist read products"       ON products FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "artist update products"     ON products FOR UPDATE USING (artist_id = auth.uid());
CREATE POLICY "artist delete products"     ON products FOR DELETE USING (artist_id = auth.uid());

-- Studios: scoped to artist_id = auth.uid()
CREATE POLICY "artist insert studios"      ON studios FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "artist read studios"        ON studios FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "artist update studios"      ON studios FOR UPDATE USING (artist_id = auth.uid());
CREATE POLICY "artist delete studios"      ON studios FOR DELETE USING (artist_id = auth.uid());

-- Modules: via studio ownership
CREATE POLICY "artist insert modules"      ON modules FOR INSERT
  WITH CHECK (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));
CREATE POLICY "artist read modules"        ON modules FOR SELECT
  USING (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));
CREATE POLICY "artist delete modules"      ON modules FOR DELETE
  USING (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));

-- Sessions: via module → studio ownership
CREATE POLICY "artist insert sessions"     ON sessions FOR INSERT
  WITH CHECK (module_id IN (
    SELECT m.id FROM modules m
    JOIN studios s ON s.id = m.studio_id
    WHERE s.artist_id = auth.uid()
  ));
CREATE POLICY "artist read sessions"       ON sessions FOR SELECT
  USING (module_id IN (
    SELECT m.id FROM modules m
    JOIN studios s ON s.id = m.studio_id
    WHERE s.artist_id = auth.uid()
  ));

-- Resources: via studio ownership
CREATE POLICY "artist insert resources"    ON resources FOR INSERT
  WITH CHECK (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));
CREATE POLICY "artist read resources"      ON resources FOR SELECT
  USING (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));
CREATE POLICY "artist delete resources"    ON resources FOR DELETE
  USING (studio_id IN (SELECT id FROM studios WHERE artist_id = auth.uid()));

-- ============================================================
-- Helper: auto-update updated_at on artists
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
