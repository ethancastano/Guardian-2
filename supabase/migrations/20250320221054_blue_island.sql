/*
  # Update profiles table for multiple roles

  1. Changes
    - Add roles array column
    - Drop old role column
    - Set default roles array to ['CTR']
  
  2. Notes
    - Preserves existing triggers and policies
    - Migrates existing role data to new array format
*/

-- First, add the new roles column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['CTR']::text[];

-- Migrate existing role data to the new array format
DO $$ 
BEGIN 
  -- Only run if the 'role' column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Update the roles array based on existing role
    UPDATE profiles 
    SET roles = ARRAY[role]::text[] 
    WHERE role IS NOT NULL;

    -- Drop the old role column
    ALTER TABLE profiles DROP COLUMN role;
  END IF;
END $$;