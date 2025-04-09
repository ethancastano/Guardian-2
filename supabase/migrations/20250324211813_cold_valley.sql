/*
  # Add patron ID to 8300s and create patron records

  1. Changes
    - Add patron_id column to form_8300s table
    - Create patron records for existing 8300s
    - Link 8300s to their corresponding patrons
    
  2. Notes
    - Uses existing patron records if they exist
    - Creates new patron records if needed
    - Updates 8300s with patron_id references
*/

-- Add patron_id column to form_8300s table
ALTER TABLE form_8300s
ADD COLUMN IF NOT EXISTS patron_id uuid REFERENCES patrons(id);

-- Insert patrons from existing 8300s and update the references
WITH new_patrons AS (
  INSERT INTO patrons (first_name, last_name, date_of_birth)
  SELECT DISTINCT
    first_name,
    last_name,
    date_of_birth
  FROM form_8300s
  ON CONFLICT (first_name, last_name, date_of_birth) DO UPDATE
  SET updated_at = now()
  RETURNING id, first_name, last_name, date_of_birth
)
UPDATE form_8300s
SET patron_id = new_patrons.id
FROM new_patrons
WHERE 
  form_8300s.first_name = new_patrons.first_name AND
  form_8300s.last_name = new_patrons.last_name AND
  form_8300s.date_of_birth = new_patrons.date_of_birth;