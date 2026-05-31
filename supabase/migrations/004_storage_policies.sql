-- ============================================================
-- TradeOS: Storage Buckets & Policies
-- ============================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-images', 'trade-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Storage Policies for trade-images
CREATE POLICY "Public Read for trade-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'trade-images');

CREATE POLICY "Authenticated Insert for trade-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'trade-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete for trade-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'trade-images' AND auth.role() = 'authenticated');

-- 3. Create Storage Policies for avatars
CREATE POLICY "Public Read for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Insert for avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update for avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete for avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
