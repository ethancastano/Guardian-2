/*
  # Update CTRs table RLS policies

  1. Changes
    - Add policy to allow users to update their assigned cases
    - Add policy to allow users to return cases to case management
    - Ensure users can only modify cases they own

  2. Security
    - Maintain RLS enabled on CTRs table
    - Add specific policies for case ownership changes
*/

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update CTRs they own" ON ctrs;

-- Create new update policy that allows users to:
-- 1. Update cases they own (current_owner = auth.uid())
-- 2. Set current_owner to null when returning to case management
CREATE POLICY "Users can update CTRs they own"
  ON ctrs
  FOR UPDATE
  TO authenticated
  USING (
    current_owner = auth.uid()
  )
  WITH CHECK (
    (current_owner = auth.uid() AND status <> 'New') OR
    (current_owner IS NULL AND status = 'New')
  );