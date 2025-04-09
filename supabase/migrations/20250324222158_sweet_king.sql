/*
  # Add form file columns to CTRs and Form 8300s tables

  1. Changes
    - Add ctr_form_file column to ctrs table
    - Add form_file column to form_8300s table
    - Update existing triggers to handle form file generation
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add form file columns
ALTER TABLE ctrs 
ADD COLUMN IF NOT EXISTS ctr_form_file text;

ALTER TABLE form_8300s
ADD COLUMN IF NOT EXISTS form_file text;

-- Update CTR form generation function
CREATE OR REPLACE FUNCTION generate_ctr_form() RETURNS trigger AS $$
BEGIN
  -- Only generate form when status changes to "Under Review"
  IF NEW.status = 'Under Review' AND 
     (OLD.status IS NULL OR OLD.status != 'Under Review') THEN
    
    -- Generate file name
    NEW.ctr_form_file := 'CTR_' || 
      NEW.ctr_id || '_' ||
      NEW.first_name || '_' ||
      NEW.last_name || '_' ||
      to_char(NEW.gaming_day, 'YYYYMMDD') || '.pdf';
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create 8300 form generation function
CREATE OR REPLACE FUNCTION generate_8300_form() RETURNS trigger AS $$
BEGIN
  -- Only generate form when status changes to "Under Review"
  IF NEW.status = 'Under Review' AND 
     (OLD.status IS NULL OR OLD.status != 'Under Review') THEN
    
    -- Generate file name
    NEW.form_file := '8300_' || 
      NEW.form_id || '_' ||
      NEW.first_name || '_' ||
      NEW.last_name || '_' ||
      to_char(NEW.gaming_day, 'YYYYMMDD') || '.pdf';
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to form_8300s table
DROP TRIGGER IF EXISTS generate_8300_form_trigger ON form_8300s;
CREATE TRIGGER generate_8300_form_trigger
  BEFORE UPDATE ON form_8300s
  FOR EACH ROW
  EXECUTE FUNCTION generate_8300_form();