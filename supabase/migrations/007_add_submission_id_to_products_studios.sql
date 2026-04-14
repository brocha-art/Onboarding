-- ============================================================
-- Migration 007: Link products and studios to their submission
-- Run in Supabase SQL editor
-- ============================================================

-- Add submission_id to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL;

-- Add submission_id to studios
ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL;

-- Index for fast lookup by submission
CREATE INDEX IF NOT EXISTS products_submission_id_idx ON products(submission_id);
CREATE INDEX IF NOT EXISTS studios_submission_id_idx  ON studios(submission_id);
