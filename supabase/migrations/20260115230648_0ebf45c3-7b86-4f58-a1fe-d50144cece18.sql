-- Fix: Storage UPDATE policy lacks ownership verification
-- Drop existing policy that doesn't check ownership
DROP POLICY IF EXISTS "Users can update their own campaign images" ON storage.objects;

-- Recreate with ownership check - images must be organized as {user_id}/{campaign_id}.ext
CREATE POLICY "Users can update their own campaign images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'campaign-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);