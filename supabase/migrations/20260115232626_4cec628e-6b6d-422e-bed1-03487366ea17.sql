-- Fix storage INSERT policy to include ownership verification
-- This ensures users can only upload to their own user_id folder

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;

-- Create new INSERT policy with ownership verification
CREATE POLICY "Authenticated users can upload campaign images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);