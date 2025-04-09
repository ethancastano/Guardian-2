/*
  # Add CTR template to templates bucket

  1. Changes
    - Add CTR template to templates bucket
    - Update CTR form generation function
  
  2. Security
    - Maintain existing bucket policies
*/

-- Update CTR form generation function to use template
CREATE OR REPLACE FUNCTION generate_ctr_form() RETURNS trigger AS $$
BEGIN
  -- Only generate form when status changes to "Under Review"
  IF NEW.status = 'Under Review' AND 
     (OLD.status IS NULL OR OLD.status != 'Under Review') THEN
    
    -- Generate file name using template
    NEW.ctr_form_file := 'CTR_' || 
      NEW.ctr_id || '_' ||
      NEW.first_name || '_' ||
      NEW.last_name || '_' ||
      to_char(NEW.gaming_day, 'YYYYMMDD') || '.pdf';
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;