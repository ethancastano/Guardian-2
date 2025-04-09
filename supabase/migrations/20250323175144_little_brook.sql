/*
  # Fix Form 8300s RLS Policies

  1. Changes
    - Update RLS policies for form_8300s table to allow case assignment
    - Add policy for assigning new cases
    - Add policy for updating assigned cases
    - Maintain existing policies for viewing and creating

  2. Security
    - Allow users to assign new cases to themselves
    - Allow users to update cases they own
    - Maintain data access control
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update 8300s they own" ON form_8300s;

-- Create new policies for case assignment and updates
CREATE POLICY "Users can assign and update 8300s"
  ON form_8300s
  FOR UPDATE
  TO authenticated
  USING (
    status = 'New' OR 
    current_owner = auth.uid()
  )
  WITH CHECK (
    (
      -- Allow assigning new cases
      (status = 'New' AND current_owner IS NOT NULL) OR
      -- Allow updating owned cases
      (current_owner = auth.uid() AND status <> 'New') OR
      -- Allow returning cases to case management
      (current_owner IS NULL AND status = 'New')
    )
  );