-- ============================================================
-- Migration 006: Allow admins to read all products and studios
-- Run in Supabase SQL editor
-- ============================================================

-- Products
DROP POLICY IF EXISTS "products_admin_read" ON products;
CREATE POLICY "products_admin_read" ON products
  FOR SELECT USING (public.is_admin());

-- Studios
DROP POLICY IF EXISTS "studios_admin_read" ON studios;
CREATE POLICY "studios_admin_read" ON studios
  FOR SELECT USING (public.is_admin());

-- Modules (nested inside studios)
DROP POLICY IF EXISTS "modules_admin_read" ON modules;
CREATE POLICY "modules_admin_read" ON modules
  FOR SELECT USING (public.is_admin());

-- Sessions (nested inside modules)
DROP POLICY IF EXISTS "sessions_admin_read" ON sessions;
CREATE POLICY "sessions_admin_read" ON sessions
  FOR SELECT USING (public.is_admin());
