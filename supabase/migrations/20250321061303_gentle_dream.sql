/*
  # Add CTR Record for Wolfgang Mozart

  1. Changes
    - Add a new CTR record for Wolfgang Mozart
    - Link to existing patron record
    - Set appropriate gaming day and transaction amounts
    - Set status as 'New'

  2. Notes
    - Uses existing patron record from historical figures data
    - Sets realistic gaming activity dates
    - Uses actual ship name from fleet
*/

WITH mozart_patron AS (
  SELECT id 
  FROM patrons 
  WHERE first_name = 'Wolfgang' 
  AND last_name = 'Mozart' 
  AND date_of_birth = '1756-01-27'
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
  '20250321_' || floor(random() * 100000)::text || '_' || floor(random() * 1000000)::text || '_CTR' as ctr_id,
  '2025-03-21'::date as gaming_day,
  'New' as status,
  'CARNIVAL CELEBRATION' as ship,
  'Wolfgang' as first_name,
  'Mozart' as last_name,
  '1756-01-27'::date as date_of_birth,
  '2025-03-15'::date as embark_date,
  '2025-03-22'::date as debark_date,
  75000.00 as cash_in_total,
  32500.00 as cash_out_total,
  id as patron_id
FROM mozart_patron;