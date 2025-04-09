/*
  # Fix templates bucket and policies

  1. Changes
    - Create templates bucket if not exists
    - Add policies for templates bucket
    - Add default CTR template
    
  2. Security
    - Allow public read access to templates
    - Restrict modifications to admin users only
*/

-- Create templates bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can read templates'
  ) THEN
    DROP POLICY "Anyone can read templates" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can modify templates'
  ) THEN
    DROP POLICY "Only admins can modify templates" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can update templates'
  ) THEN
    DROP POLICY "Only admins can update templates" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Only admins can delete templates'
  ) THEN
    DROP POLICY "Only admins can delete templates" ON storage.objects;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Anyone can read templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'templates');

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

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;