/*
  # Add recommendation column to form_8300s table

  1. Changes
    - Add recommendation column to form_8300s table
    - Maintain data consistency with CTRs table structure
*/

-- Add recommendation column to form_8300s table
ALTER TABLE form_8300s
ADD COLUMN IF NOT EXISTS recommendation text;