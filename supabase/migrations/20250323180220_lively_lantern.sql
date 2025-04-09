-- First, remove existing sample data
DELETE FROM form_8300s;

-- Insert new sample data with historical figures
INSERT INTO form_8300s (
  form_id,
  gaming_day,
  status,
  ship,
  first_name,
  last_name,
  date_of_birth,
  embark_date,
  debark_date,
  cash_in_total,
  cash_out_total
) VALUES
  -- Inventors and Scientists
  (
    '8300-20250321-001',
    '2025-03-21',
    'New',
    'CARNIVAL CELEBRATION',
    'Thomas',
    'Edison',
    '1847-02-11',
    '2025-03-15',
    '2025-03-22',
    185000.00,
    92500.00
  ),
  (
    '8300-20250321-002',
    '2025-03-20',
    'New',
    'CARNIVAL JUBILEE',
    'Marie',
    'Curie',
    '1867-11-07',
    '2025-03-14',
    '2025-03-21',
    165000.00,
    82500.00
  ),
  -- Artists and Musicians
  (
    '8300-20250321-003',
    '2025-03-19',
    'New',
    'SUN PRINCESS',
    'Ludwig',
    'Beethoven',
    '1770-12-17',
    '2025-03-13',
    '2025-03-20',
    195000.00,
    97500.00
  ),
  (
    '8300-20250321-004',
    '2025-03-18',
    'New',
    'MS ROTTERDAM',
    'Frida',
    'Kahlo',
    '1907-07-06',
    '2025-03-12',
    '2025-03-19',
    175000.00,
    87500.00
  ),
  -- Writers and Philosophers
  (
    '8300-20250321-005',
    '2025-03-17',
    'New',
    'CARNIVAL VENEZIA',
    'William',
    'Shakespeare',
    '1564-04-23',
    '2025-03-11',
    '2025-03-18',
    205000.00,
    102500.00
  ),
  (
    '8300-20250321-006',
    '2025-03-16',
    'New',
    'CROWN PRINCESS',
    'Jane',
    'Austen',
    '1775-12-16',
    '2025-03-10',
    '2025-03-17',
    155000.00,
    77500.00
  ),
  -- World Leaders
  (
    '8300-20250321-007',
    '2025-03-15',
    'New',
    'DISCOVERY PRINCESS',
    'Catherine',
    'the Great',
    '1729-05-02',
    '2025-03-09',
    '2025-03-16',
    225000.00,
    112500.00
  ),
  (
    '8300-20250321-008',
    '2025-03-14',
    'New',
    'MS NIEUW AMSTERDAM',
    'Marcus',
    'Aurelius',
    '0121-04-26',
    '2025-03-08',
    '2025-03-15',
    215000.00,
    107500.00
  ),
  -- Explorers
  (
    '8300-20250321-009',
    '2025-03-13',
    'New',
    'MAJESTIC PRINCESS',
    'Marco',
    'Polo',
    '1254-09-15',
    '2025-03-07',
    '2025-03-14',
    185000.00,
    92500.00
  ),
  (
    '8300-20250321-010',
    '2025-03-12',
    'New',
    'MS KONINGSDAM',
    'Amelia',
    'Earhart',
    '1897-07-24',
    '2025-03-06',
    '2025-03-13',
    175000.00,
    87500.00
  ),
  -- Innovators
  (
    '8300-20250321-011',
    '2025-03-11',
    'New',
    'CARNIVAL LUMINOSA',
    'Leonardo',
    'da Vinci',
    '1452-04-15',
    '2025-03-05',
    '2025-03-12',
    235000.00,
    117500.00
  ),
  (
    '8300-20250321-012',
    '2025-03-10',
    'New',
    'ENCHANTED PRINCESS',
    'Ada',
    'Lovelace',
    '1815-12-10',
    '2025-03-04',
    '2025-03-11',
    195000.00,
    97500.00
  ),
  -- Musicians
  (
    '8300-20250321-013',
    '2025-03-09',
    'New',
    'MS ZUIDERDAM',
    'Wolfgang',
    'Mozart',
    '1756-01-27',
    '2025-03-03',
    '2025-03-10',
    245000.00,
    122500.00
  ),
  (
    '8300-20250321-014',
    '2025-03-08',
    'New',
    'CARNIVAL MARDI GRAS',
    'Johann',
    'Bach',
    '1685-03-31',
    '2025-03-02',
    '2025-03-09',
    185000.00,
    92500.00
  ),
  -- Scientists
  (
    '8300-20250321-015',
    '2025-03-07',
    'New',
    'MS NOORDAM',
    'Nikola',
    'Tesla',
    '1856-07-10',
    '2025-03-01',
    '2025-03-08',
    255000.00,
    127500.00
  );