/*
  # Create 8300s Table and Sample Data

  1. New Tables
    - `form_8300s`
      - `id` (uuid, primary key)
      - `form_id` (text, unique)
      - `gaming_day` (date)
      - `current_owner` (uuid, references profiles)
      - `status` (text)
      - `ship` (text)
      - `first_name` (text)
      - `last_name` (text)
      - `date_of_birth` (date)
      - `embark_date` (date)
      - `debark_date` (date)
      - `cash_in_total` (numeric)
      - `cash_out_total` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add sample data with famous historical figures
*/

-- Create form_8300s table
CREATE TABLE IF NOT EXISTS form_8300s (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text UNIQUE NOT NULL,
  gaming_day date NOT NULL,
  current_owner uuid REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('New', 'Assigned', 'Under Review', 'Submitted', 'Approved', 'Rejected')),
  ship text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  embark_date date NOT NULL,
  debark_date date NOT NULL,
  cash_in_total numeric(10,2) NOT NULL DEFAULT 0,
  cash_out_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE form_8300s ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all 8300s"
  ON form_8300s
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update 8300s they own"
  ON form_8300s
  FOR UPDATE
  TO authenticated
  USING (current_owner = auth.uid())
  WITH CHECK (current_owner = auth.uid());

CREATE POLICY "Users can create 8300s"
  ON form_8300s
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_form_8300s_updated_at
  BEFORE UPDATE ON form_8300s
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data with famous historical figures
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
  (
    '8300-20250321-001',
    '2025-03-21',
    'New',
    'CARNIVAL CELEBRATION',
    'Bill',
    'Gates',
    '1955-10-28',
    '2025-03-15',
    '2025-03-22',
    150000.00,
    75000.00
  ),
  (
    '8300-20250321-002',
    '2025-03-20',
    'New',
    'CARNIVAL JUBILEE',
    'Elon',
    'Musk',
    '1971-06-28',
    '2025-03-14',
    '2025-03-21',
    200000.00,
    100000.00
  ),
  (
    '8300-20250321-003',
    '2025-03-19',
    'New',
    'SUN PRINCESS',
    'Warren',
    'Buffett',
    '1930-08-30',
    '2025-03-13',
    '2025-03-20',
    175000.00,
    85000.00
  ),
  (
    '8300-20250321-004',
    '2025-03-18',
    'New',
    'MS ROTTERDAM',
    'Jeff',
    'Bezos',
    '1964-01-12',
    '2025-03-12',
    '2025-03-19',
    250000.00,
    120000.00
  ),
  (
    '8300-20250321-005',
    '2025-03-17',
    'New',
    'CARNIVAL VENEZIA',
    'Mark',
    'Zuckerberg',
    '1984-05-14',
    '2025-03-11',
    '2025-03-18',
    180000.00,
    90000.00
  );