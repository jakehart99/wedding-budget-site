-- ============================================================================
-- Wedding Budget Planner - Supabase Database Schema
-- ============================================================================
-- This SQL script sets up the database schema for the Wedding Budget Planner.
-- It includes the budget_items table and Row Level Security (RLS) policies
-- that allow anyone to read, insert, update, and delete items without authentication.
--
-- To run this script:
-- 1. Go to https://app.supabase.com/project/_/sql/new
-- 2. Paste this entire script
-- 3. Click "Run" to execute
-- ============================================================================

-- Drop existing table if it exists (use with caution in production!)
-- DROP TABLE IF EXISTS budget_items CASCADE;

-- Create the budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  required TEXT,
  notes TEXT,
  unit_cost NUMERIC(10, 2),
  quantity NUMERIC(10, 2),
  sub_total NUMERIC(10, 2),
  md_content TEXT,
  html TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category);

-- Create an index on required for faster filtering
CREATE INDEX IF NOT EXISTS idx_budget_items_required ON budget_items(required);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before any UPDATE
DROP TRIGGER IF EXISTS update_budget_items_updated_at ON budget_items;
CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- These policies allow ANYONE (anonymous users) to perform all CRUD operations
-- without authentication. This is intentional per your requirements.
--
-- WARNING: This means anyone with access to your site can modify the data!
-- ============================================================================

-- Enable Row Level Security on the table
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to SELECT (read) all rows
CREATE POLICY "Allow public read access"
  ON budget_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Allow anyone to INSERT (create) new rows
CREATE POLICY "Allow public insert access"
  ON budget_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow anyone to UPDATE (edit) any row
CREATE POLICY "Allow public update access"
  ON budget_items
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anyone to DELETE any row
CREATE POLICY "Allow public delete access"
  ON budget_items
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- After running this script, you can verify everything is set up correctly:
--
-- 1. Check if the table exists:
--    SELECT * FROM budget_items LIMIT 5;
--
-- 2. Verify RLS is enabled:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'budget_items';
--
-- 3. Check RLS policies:
--    SELECT * FROM pg_policies WHERE tablename = 'budget_items';
--
-- 4. Test insert (replace with your data):
--    INSERT INTO budget_items (category, item, required, notes, unit_cost)
--    VALUES ('Test Category', 'Test Item', 'Yes', 'Test notes', 100.00);
-- ============================================================================
