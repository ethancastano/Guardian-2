/*
  # Create CTR Database Schema

  1. New Tables
    - `ctrs` table for storing Currency Transaction Reports
      - `id` (uuid, primary key)
      - `ctr_id` (text, unique) - The CTR reference number
      - `gaming_day` (date) - The gaming day for the CTR
      - `current_owner` (uuid) - Reference to profiles table
      - `status` (text) - Current status of the CTR
      - `ship` (text) - Ship name
      - `first_name` (text) - Guest's first name
      - `last_name` (text) - Guest's last name
      - `date_of_birth` (date) - Guest's date of birth
      - `embark_date` (date) - Guest's embarkation date
      - `debark_date` (date) - Guest's debarkation date
      - `cash_in_total` (numeric) - Total cash in amount
      - `cash_out_total` (numeric) - Total cash out amount
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `ctrs` table
    - Add policies for:
      - Viewing CTRs (all authenticated users)
      - Updating CTRs (owners only)
      - Creating CTRs (authenticated users)

  3. Indexes
    - Primary key on `id`
    - Unique index on `ctr_id`
    - Index on `gaming_day` for efficient date queries
    - Index on `current_owner` for efficient owner lookups
    - Index on `status` for efficient status filtering
*/

-- Create CTRs table
CREATE TABLE IF NOT EXISTS ctrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ctr_id text UNIQUE NOT NULL,
  gaming_day date NOT NULL,
  current_owner uuid REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('New', 'Assigned', 'Under Review', 'Submitted', 'Approved')),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS ctrs_gaming_day_idx ON ctrs(gaming_day);
CREATE INDEX IF NOT EXISTS ctrs_current_owner_idx ON ctrs(current_owner);
CREATE INDEX IF NOT EXISTS ctrs_status_idx ON ctrs(status);

-- Enable RLS
ALTER TABLE ctrs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all CTRs"
  ON ctrs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update CTRs they own"
  ON ctrs
  FOR UPDATE
  TO authenticated
  USING (current_owner = auth.uid())
  WITH CHECK (current_owner = auth.uid());

CREATE POLICY "Users can create CTRs"
  ON ctrs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_ctrs_updated_at
  BEFORE UPDATE ON ctrs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO ctrs (
  ctr_id,
  gaming_day,
  current_owner,
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
    '20250227_63780_1564491_CTR',
    '2025-02-27',
    (SELECT id FROM profiles WHERE full_name = 'Ethan Castano' LIMIT 1),
    'Under Review',
    'CARNIVAL MARDI GRAS',
    'JEFFREY',
    'ASHER',
    '1977-09-04',
    '2025-02-22',
    '2025-03-01',
    12600.00,
    13.40
  ),
  (
    '20250227_63275_21609111_CTR',
    '2025-02-27',
    (SELECT id FROM profiles WHERE full_name = 'Ethan Castano' LIMIT 1),
    'Assigned',
    'CARNIVAL DREAM',
    'JEFFREY',
    'KRISIAK JR',
    '1995-05-12',
    '2025-02-22',
    '2025-03-02',
    3000.00,
    11.80
  ),
  (
    '20250227_62769_1625276_CTR',
    '2025-02-27',
    (SELECT id FROM profiles WHERE full_name = 'Ethan Castano' LIMIT 1),
    'Assigned',
    'SUN PRINCESS',
    'CORALYN',
    'RAMIREZ',
    '1970-10-31',
    '2025-02-22',
    '2025-03-01',
    35900.00,
    0.00
  );