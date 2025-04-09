/*
  # Add approver column to form_8300s table

  1. Changes
    - Add approver column to form_8300s table
    - Add foreign key constraint to profiles table
    - Maintain data consistency with CTRs table structure
*/

-- Add approver column to form_8300s table
ALTER TABLE form_8300s
ADD COLUMN IF NOT EXISTS approver uuid REFERENCES profiles(id);