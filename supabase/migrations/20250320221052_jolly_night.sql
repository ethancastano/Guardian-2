/*
  # Update profiles table for multiple roles

  1. Changes
    - Add roles array column to profiles table
    - Migrate existing role data to new roles array
    - Drop old role column
  
  2. Security
    - Maintains existing RLS policies
*/

-- First check if we need to add the roles column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'roles'
  ) THEN
    -- Add new roles array column
    ALTER TABLE profiles 
    ADD COLUMN roles text[] DEFAULT ARRAY['CTR']::text[];

    -- Migrate existing role data to the new array column
    UPDATE profiles 
    SET roles = ARRAY[role]::text[]
    WHERE role IS NOT NULL;
  END IF;
END $$;

-- Check if we need to drop the old role column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles 
    DROP COLUMN role;
  END IF;
END $$;