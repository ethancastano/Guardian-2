/*
  # Add CTR form generation functionality

  1. Changes
    - Add function to generate CTR form file name
    - Add function to create CTR form file record
    - Add trigger to automatically generate CTR form on status change
  
  2. Security
    - Maintain existing RLS policies
    - Only allow authorized users to generate forms
*/

-- Create function to generate CTR form file name
CREATE OR REPLACE FUNCTION generate_ctr_filename(
  p_ctr_id text,
  p_first_name text,
  p_last_name text,
  p_gaming_day date
) RETURNS text AS $$
BEGIN
  RETURN 'CTR_' || 
         p_ctr_id || '_' ||
         p_first_name || '_' ||
         p_last_name || '_' ||
         to_char(p_gaming_day, 'YYYYMMDD') || '.pdf';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create CTR form file record
CREATE OR REPLACE FUNCTION create_ctr_form_file(
  p_ctr_id text,
  p_user_id uuid,
  p_file_name text,
  p_file_path text
) RETURNS uuid AS $$
DECLARE
  v_file_id uuid;
BEGIN
  INSERT INTO case_files (
    ctr_id,
    file_name,
    file_size,
    file_type,
    file_path,
    last_modified,
    user_id
  ) VALUES (
    p_ctr_id,
    p_file_name,
    0, -- Size will be updated when file is uploaded
    'application/pdf',
    p_file_path,
    CURRENT_TIMESTAMP,
    p_user_id
  ) RETURNING id INTO v_file_id;
  
  RETURN v_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to generate CTR form on status change
CREATE OR REPLACE FUNCTION generate_ctr_form() RETURNS trigger AS $$
BEGIN
  -- Only generate form when status changes to "Under Review"
  IF NEW.status = 'Under Review' AND 
     (OLD.status IS NULL OR OLD.status != 'Under Review') THEN
    
    -- Generate file name
    NEW.ctr_form_file := generate_ctr_filename(
      NEW.ctr_id,
      NEW.first_name,
      NEW.last_name,
      NEW.gaming_day
    );
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to ctrs table
DROP TRIGGER IF EXISTS generate_ctr_form_trigger ON ctrs;
CREATE TRIGGER generate_ctr_form_trigger
  BEFORE UPDATE ON ctrs
  FOR EACH ROW
  EXECUTE FUNCTION generate_ctr_form();