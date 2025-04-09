/*
  # Create storage bucket for case files
  
  1. Storage Setup
    - Creates a new storage bucket named 'case-files'
    - Sets up RLS policies for authenticated users to:
      - Upload files
      - Read files
      - Update files
      - Delete files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-files', 'case-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  -- Create upload policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can upload case files'
  ) THEN
    CREATE POLICY "Authenticated users can upload case files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'case-files');
  END IF;

  -- Create read policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can read case files'
  ) THEN
    CREATE POLICY "Authenticated users can read case files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'case-files');
  END IF;

  -- Create update policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can update their case files'
  ) THEN
    CREATE POLICY "Authenticated users can update their case files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'case-files' AND auth.uid() = owner);
  END IF;

  -- Create delete policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can delete their case files'
  ) THEN
    CREATE POLICY "Authenticated users can delete their case files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'case-files' AND auth.uid() = owner);
  END IF;
END $$;