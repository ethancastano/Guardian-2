/*
  # Insert existing CTR data into patrons database

  1. Changes
    - Insert patron data from existing CTRs
    - Link CTRs to their corresponding patrons
    - Handle duplicate patrons by using unique constraint
  
  2. Notes
    - Uses ON CONFLICT to handle duplicate patrons
    - Updates CTRs with patron_id references
*/

-- First, insert patrons from existing CTRs
WITH new_patrons AS (
  INSERT INTO patrons (first_name, last_name, date_of_birth)
  SELECT DISTINCT
    first_name,
    last_name,
    date_of_birth
  FROM ctrs
  ON CONFLICT (first_name, last_name, date_of_birth) DO UPDATE
  SET updated_at = now()
  RETURNING id, first_name, last_name, date_of_birth
)
-- Then update CTRs with patron_id references
UPDATE ctrs
SET patron_id = new_patrons.id
FROM new_patrons
WHERE 
  ctrs.first_name = new_patrons.first_name AND
  ctrs.last_name = new_patrons.last_name AND
  ctrs.date_of_birth = new_patrons.date_of_birth;