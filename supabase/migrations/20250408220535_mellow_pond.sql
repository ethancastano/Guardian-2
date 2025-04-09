/*
  # Add Additional Patron Profile Fields

  1. Changes
    - Add contact information fields (phone, email, address)
    - Add identification fields (SSN, DL/Passport)
    - Add occupation information
    - Add proper constraints and validation

  2. Security
    - Maintain existing RLS policies
    - Ensure sensitive data is properly handled
*/

-- Add new columns to patrons table
ALTER TABLE patrons
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS email_address text,
ADD COLUMN IF NOT EXISTS address_line text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS ssn text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS id_type text CHECK (id_type IN ('DL', 'Passport')),
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS id_state text,
ADD COLUMN IF NOT EXISTS id_country text;

-- Add email format check
ALTER TABLE patrons
ADD CONSTRAINT email_format_check
CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add phone format check (allows various formats including international)
ALTER TABLE patrons
ADD CONSTRAINT phone_format_check
CHECK (phone_number ~* '^\+?[0-9\s\-\(\)\.]{10,}$');

-- Add SSN format check (XXX-XX-XXXX)
ALTER TABLE patrons
ADD CONSTRAINT ssn_format_check
CHECK (ssn IS NULL OR ssn ~* '^\d{3}-\d{2}-\d{4}$');

-- Create index for efficient email searches
CREATE INDEX IF NOT EXISTS idx_patrons_email ON patrons(email_address);

-- Create index for efficient phone searches
CREATE INDEX IF NOT EXISTS idx_patrons_phone ON patrons(phone_number);

-- Create index for efficient ID searches
CREATE INDEX IF NOT EXISTS idx_patrons_id_number ON patrons(id_number);