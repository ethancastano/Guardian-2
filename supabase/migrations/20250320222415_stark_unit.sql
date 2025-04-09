/*
  # Fix profiles table RLS policies with efficient admin checks

  1. Changes
    - Remove all existing policies to start fresh
    - Implement non-recursive admin checks
    - Use security definer function for admin checks
    - Maintain security while preventing recursion

  2. Security
    - Users can read and update their own profiles
    - Admins can read and update all profiles
    - Efficient policy logic without recursion
*/

-- First, create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT is_admin FROM profiles WHERE id = user_id;
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

-- Create new, efficient policies
CREATE POLICY "profiles_select_policy"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  public.is_admin(auth.uid())
);

CREATE POLICY "profiles_update_policy"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = id OR 
  public.is_admin(auth.uid())
);