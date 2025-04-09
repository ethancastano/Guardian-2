/*
  # Add approver and recommendation columns to ctrs table

  1. Changes
    - Add approver column to store the approver's ID
    - Add recommendation column to store the recommendation type
    - Add foreign key constraint for approver
*/

-- Add approver and recommendation columns
ALTER TABLE ctrs
ADD COLUMN IF NOT EXISTS approver uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS recommendation text;