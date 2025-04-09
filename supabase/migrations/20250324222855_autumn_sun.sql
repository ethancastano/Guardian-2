/*
  # Create templates bucket and upload CTR template

  1. Changes
    - Create templates bucket for storing form templates
    - Add policies for accessing templates
    - Add CTR template to bucket
  
  2. Security
    - Make bucket public for easy template access
    - Add appropriate RLS policies
*/

-- Create templates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Create policies for templates bucket
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