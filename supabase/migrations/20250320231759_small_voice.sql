/*
  # Add recommendation fields to CTRs table

  1. Changes
    - Add recommendation column for storing submission recommendations
    - Add approver column for storing approver information

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE ctrs
ADD COLUMN IF NOT EXISTS recommendation text,
ADD COLUMN IF NOT EXISTS approver text;