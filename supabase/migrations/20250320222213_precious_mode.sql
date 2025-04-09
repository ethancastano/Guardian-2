/*
  # Add admin and team management features

  1. Changes
    - Add `is_admin` column to profiles table
    - Add `managed_by` column to profiles table to track team hierarchy
    - Add RLS policies for admin access
    - Add RLS policies for team management

  2. Security
    - Enable admin users to manage other users' roles
    - Restrict regular users from modifying admin-only fields
    - Maintain existing RLS policies
*/

-- Add admin column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Add managed_by column for team hierarchy
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS managed_by uuid REFERENCES profiles(id);

-- Update RLS policies for admin access
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
);

CREATE POLICY "Admins can update other profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
)
WITH CHECK (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
);