/*
  # Create Patrons Database Schema

  1. New Tables
    - `patrons` table for storing patron information
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `date_of_birth` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
  2. Changes
    - Add foreign key to CTRs table linking to patrons
    - Add indexes for efficient patron search
    
  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create patrons table
CREATE TABLE IF NOT EXISTS patrons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(first_name, last_name, date_of_birth)
);

-- Add patron_id to CTRs table
ALTER TABLE ctrs
ADD COLUMN IF NOT EXISTS patron_id uuid REFERENCES patrons(id);

-- Create indexes for patron search
CREATE INDEX IF NOT EXISTS idx_patron_name_dob ON patrons (first_name, last_name, date_of_birth);

-- Enable RLS
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view patrons"
  ON patrons
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_patrons_updated_at
  BEFORE UPDATE ON patrons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();