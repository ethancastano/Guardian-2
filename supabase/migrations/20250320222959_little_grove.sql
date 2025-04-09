/*
  # Create cases table for CTR tracking

  1. New Tables
    - `cases`
      - `id` (uuid, primary key)
      - `ctr_id` (text, unique)
      - `status` (text)
      - `current_owner` (uuid, references profiles)
      - `gaming_day` (date)
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
*/

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ctr_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'New',
  current_owner uuid REFERENCES profiles(id),
  gaming_day date NOT NULL,
  ship text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  embark_date date NOT NULL,
  debark_date date NOT NULL,
  cash_in_total numeric(10,2) NOT NULL DEFAULT 0,
  cash_out_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Add constraint to validate status values
  CONSTRAINT valid_status CHECK (status IN ('New', 'Assigned', 'Under Review', 'Submitted', 'Approved'))
);

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update cases they own"
  ON cases
  FOR UPDATE
  TO authenticated
  USING (current_owner = auth.uid())
  WITH CHECK (current_owner = auth.uid());

-- Create trigger to update updated_at
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();