/*
  # Update CTRs table RLS policies for case assignment

  1. Changes
    - Add policy to allow assigning cases to users
    - Update policy for case ownership changes
    - Ensure proper status transitions

  2. Security
    - Maintain RLS enabled on CTRs table
    - Add specific policies for case assignments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update CTRs they own" ON ctrs;

-- Create new policies for case assignment and updates
CREATE POLICY "Users can assign and update CTRs"
  ON ctrs
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