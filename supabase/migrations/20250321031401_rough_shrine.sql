/*
  # Add patron files management system

  1. New Tables
    - `patron_files`
      - `id` (uuid, primary key)
      - `patron_id` (uuid, references patrons)
      - `file_name` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `file_path` (text)
      - `uploaded_at` (timestamptz)
      - `last_modified` (timestamptz)
      - `user_id` (uuid, references auth.users)
      - `description` (text)

  2. Storage
    - Create 'patron-files' bucket for storing patron-related documents
  
  3. Security
    - Enable RLS on patron_files table
    - Add policies for authenticated users
    - Set up storage policies
*/

-- Create patron_files table
CREATE TABLE IF NOT EXISTS patron_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_id uuid REFERENCES patrons(id) NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_modified timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  description text
);

-- Enable RLS
ALTER TABLE patron_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view patron files"
  ON patron_files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload patron files"
  ON patron_files
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own patron files"
  ON patron_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patron files"
  ON patron_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('patron-files', 'patron-files', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload patron files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patron-files');

CREATE POLICY "Authenticated users can update their patron files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'patron-files');

CREATE POLICY "Authenticated users can read patron files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'patron-files');

CREATE POLICY "Authenticated users can delete their patron files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'patron-files');