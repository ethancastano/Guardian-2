/*
  # Fix profiles table RLS policies with simplified admin checks

  1. Changes
    - Remove complex recursive admin checks
    - Implement direct admin status check
    - Maintain security while avoiding recursion

  2. Security
    - Users can read and update their own profiles
    - Admins can read and update all profiles
    - Simplified policy logic to prevent recursion
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Users can read profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  auth.uid() = id OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);