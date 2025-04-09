/*
  # Add name fields to profiles table

  1. Changes
    - Add first_name and last_name columns to profiles table
    - Add full_name computed column
    - Migrate existing data if any name exists
*/

-- Add name columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Add computed full_name column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name text
GENERATED ALWAYS AS (
  CASE
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE NULL
  END
) STORED;