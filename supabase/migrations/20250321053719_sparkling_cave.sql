/*
  # Add Rejected status to CTRs table

  1. Changes
    - Add 'Rejected' as a valid status in the ctrs_status_check constraint
    - Preserve existing status values
    - Update constraint without data loss
*/

-- Drop the existing constraint
ALTER TABLE ctrs
DROP CONSTRAINT IF EXISTS ctrs_status_check;

-- Add the new constraint with 'Rejected' status
ALTER TABLE ctrs
ADD CONSTRAINT ctrs_status_check 
CHECK (status IN ('New', 'Assigned', 'Under Review', 'Submitted', 'Approved', 'Rejected'));