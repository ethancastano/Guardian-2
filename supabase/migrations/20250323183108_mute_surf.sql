/*
  # Update case_files table to support both CTR and 8300 forms

  1. Changes
    - Add form_id column to case_files table
    - Make ctr_id column nullable
    - Add check constraint to ensure either ctr_id or form_id is set
    - Update existing policies to handle both types
*/

-- First, add the form_id column
ALTER TABLE case_files
ADD COLUMN IF NOT EXISTS form_id text;

-- Make ctr_id nullable
ALTER TABLE case_files
ALTER COLUMN ctr_id DROP NOT NULL;

-- Add check constraint to ensure at least one ID is set
ALTER TABLE case_files
ADD CONSTRAINT case_files_id_check 
CHECK (
  (ctr_id IS NOT NULL AND form_id IS NULL) OR 
  (form_id IS NOT NULL AND ctr_id IS NULL)
);

-- Update policies to handle both types
DROP POLICY IF EXISTS "Users can view their own case files" ON case_files;
DROP POLICY IF EXISTS "Users can insert their own case files" ON case_files;
DROP POLICY IF EXISTS "Users can update their own case files" ON case_files;
DROP POLICY IF EXISTS "Users can delete their own case files" ON case_files;

-- Create new policies
CREATE POLICY "Users can view their own case files"
  ON case_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case files"
  ON case_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case files"
  ON case_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case files"
  ON case_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);