-- FIXED Storage Policies for avatars bucket
-- DELETE old policies first, then run this

-- 1. Remove old policies (if any)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 2. Simple policy: Allow authenticated users to upload to avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Allow users to update files that start with their user ID
CREATE POLICY "Users can update their own avatar files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)) LIKE (auth.uid()::text || '%')
);

-- 4. Allow users to delete files that start with their user ID
CREATE POLICY "Users can delete their own avatar files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)) LIKE (auth.uid()::text || '%')
);

-- 5. Allow public to view avatars (read-only)
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
