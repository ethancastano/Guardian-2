/*
  # Create templates bucket and add CTR template

  1. Changes
    - Create templates bucket if not exists
    - Add policies for templates bucket
    - Add CTR template file
    
  2. Security
    - Allow public read access to templates
    - Restrict modifications to admin users only
*/

-- Create templates bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Safely create policies with existence checks
DO $$ 
BEGIN
  -- Check and create select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can read templates'
  ) THEN
    CREATE POLICY "Anyone can read templates"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'templates');
  END IF;

  -- Check and create insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can modify templates'
  ) THEN
    CREATE POLICY "Only admins can modify templates"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'templates' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
      )
    );
  END IF;

  -- Check and create update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can update templates'
  ) THEN
    CREATE POLICY "Only admins can update templates"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'templates' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
      )
    );
  END IF;

  -- Check and create delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can delete templates'
  ) THEN
    CREATE POLICY "Only admins can delete templates"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'templates' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
      )
    );
  END IF;
END $$;