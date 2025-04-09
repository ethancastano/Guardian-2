/*
  # Add patron profile fields

  1. New Columns
    - phone_number (text)
    - email_address (text)
    - address_line (text) 
    - city (text)
    - state (text)
    - country (text, default 'USA')
    - ssn (text)
    - occupation (text)
    - id_type (text, check DL/Passport)
    - id_number (text)
    - id_state (text)
    - id_country (text)

  2. Constraints
    - Email format validation
    - Phone format validation
    - SSN format validation (XXX-XX-XXXX)

  3. Indexes
    - Email address
    - Phone number
    - ID number
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
CHECK (email_address IS NULL OR email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add phone format check (allows various formats including international)
ALTER TABLE patrons
ADD CONSTRAINT phone_format_check
CHECK (phone_number IS NULL OR phone_number ~* '^\+?[0-9\s\-\(\)\.]{10,}$');

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