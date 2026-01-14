-- Create public storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images', 
  'campaign-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

-- Allow public read access to campaign images
CREATE POLICY "Public can view campaign images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'campaign-images');

-- Allow authenticated users to upload their own campaign images
CREATE POLICY "Authenticated users can upload campaign images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own campaign images
CREATE POLICY "Users can update their own campaign images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'campaign-images' 
  AND auth.role() = 'authenticated'
);