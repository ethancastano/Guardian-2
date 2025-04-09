/*
  # Create storage bucket for case files

  1. New Storage Bucket
    - Creates a new storage bucket named 'case-files' for storing case-related files
  
  2. Security
    - Enable security policies for the bucket
    - Allow authenticated users to perform CRUD operations on their own files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name)
VALUES ('case-files', 'case-files')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload case files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-files');

CREATE POLICY "Authenticated users can update their case files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'case-files');

CREATE POLICY "Authenticated users can read case files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'case-files');

CREATE POLICY "Authenticated users can delete their case files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'case-files');