/*
  # Case Files Storage Schema

  1. New Tables
    - `case_files`
      - `id` (uuid, primary key)
      - `ctr_id` (text, references the case ID)
      - `file_name` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `file_path` (text)
      - `uploaded_at` (timestamptz)
      - `last_modified` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `case_files` table
    - Add policies for authenticated users to manage their files
*/

CREATE TABLE IF NOT EXISTS case_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ctr_id text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_modified timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case files"
  ON case_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case files"
  ON case_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case files"
  ON case_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case files"
  ON case_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);