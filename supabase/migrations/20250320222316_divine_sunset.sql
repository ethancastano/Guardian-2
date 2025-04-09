/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite recursion
    - Implement simplified RLS policies for profiles table
    - Maintain security while avoiding circular dependencies

  2. Security
    - Users can read and update their own profiles
    - Admins can read and update all profiles
    - Maintain data access control without recursion
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin-specific policies that don't cause recursion
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.id IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  )
);

CREATE POLICY "Admins can update all profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.id IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.id IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  )
);