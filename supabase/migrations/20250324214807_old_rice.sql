/*
  # Add CTR Record for Thomas Edison

  1. Changes
    - Add a new CTR record for Thomas Edison
    - Link to existing patron record
    - Set appropriate gaming day and transaction amounts
    - Set status as 'New'

  2. Notes
    - Uses existing patron record from historical figures data
    - Sets realistic gaming activity dates
    - Uses actual ship name from fleet
*/

-- First ensure we have a patron record for Edison
INSERT INTO patrons (first_name, last_name, date_of_birth)
VALUES ('Thomas', 'Edison', '1847-02-11')
ON CONFLICT (first_name, last_name, date_of_birth) DO UPDATE
SET updated_at = now()
RETURNING id;

-- Then create the CTR record
WITH edison_patron AS (
  SELECT id 
  FROM patrons 
  WHERE first_name = 'Thomas' 
  AND last_name = 'Edison' 
  AND date_of_birth = '1847-02-11'
  LIMIT 1
)
INSERT INTO ctrs (
  ctr_id,
  gaming_day,
  status,
  ship,
  first_name,
  last_name,
  date_of_birth,
  embark_date,
  debark_date,
  cash_in_total,
  cash_out_total,
  patron_id
)
SELECT
  '20250324_' || floor(random() * 100000)::text || '_' || floor(random() * 1000000)::text || '_CTR' as ctr_id,
  '2025-03-24'::date as gaming_day,
  'New' as status,
  'CARNIVAL CELEBRATION' as ship,
  'Thomas' as first_name,
  'Edison' as last_name,
  '1847-02-11'::date as date_of_birth,
  '2025-03-20'::date as embark_date,
  '2025-03-27'::date as debark_date,
  45000.00 as cash_in_total,
  22500.00 as cash_out_total,
  id as patron_id
FROM edison_patron;