/*
  # Add Historical Figure Sample Data

  1. Changes
    - Add 15 new CTR records with historical figures
    - Maintain data consistency with existing schema
    - Create corresponding patron records first
    - Link CTRs to patrons via patron_id
*/

-- First, insert the patron records
WITH new_patrons AS (
  INSERT INTO patrons (first_name, last_name, date_of_birth)
  VALUES 
    ('Albert', 'Einstein', '1879-03-14'),
    ('Marie', 'Curie', '1867-11-07'),
    ('Leonardo', 'da Vinci', '1452-04-15'),
    ('William', 'Shakespeare', '1564-04-26'),
    ('Cleopatra', 'VII', '0069-01-01'),
    ('Wolfgang', 'Mozart', '1756-01-27'),
    ('Florence', 'Nightingale', '1820-05-12'),
    ('Charles', 'Darwin', '1809-02-12'),
    ('Frida', 'Kahlo', '1907-07-06'),
    ('Mahatma', 'Gandhi', '1869-10-02'),
    ('Vincent', 'van Gogh', '1853-03-30'),
    ('Jane', 'Austen', '1775-12-16'),
    ('Nikola', 'Tesla', '1856-07-10'),
    ('Rosa', 'Parks', '1913-02-04'),
    ('Pablo', 'Picasso', '1881-10-25')
  ON CONFLICT (first_name, last_name, date_of_birth) DO UPDATE
  SET updated_at = now()
  RETURNING id, first_name, last_name, date_of_birth
)
-- Then insert the CTR records
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
  '2025-03-21'::date - (floor(random() * 30)::int || ' days')::interval as gaming_day,
  'New' as status,
  CASE floor(random() * 5)
    WHEN 0 THEN 'CARNIVAL CELEBRATION'
    WHEN 1 THEN 'CARNIVAL ELATION'
    WHEN 2 THEN 'PRINCESS SUN'
    WHEN 3 THEN 'CARNIVAL VALOR'
    ELSE 'PRINCESS JUBILEE'
  END as ship,
  first_name,
  last_name,
  date_of_birth,
  '2025-03-01'::date - (floor(random() * 30)::int || ' days')::interval as embark_date,
  '2025-03-21'::date - (floor(random() * 30)::int || ' days')::interval as debark_date,
  floor(random() * 90000 + 10000)::numeric(10,2) as cash_in_total,
  floor(random() * 50000)::numeric(10,2) as cash_out_total,
  id as patron_id
FROM new_patrons;