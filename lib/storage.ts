import { supabase } from './supabase';

export async function uploadFile(file: File, bucket: string, path: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function uploadVendorDocument(file: File, subfolder: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${subfolder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('vendor-documents')
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from('vendor-documents')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function uploadMultipleFiles(files: File[], bucket: string, path: string) {
  const uploadPromises = files.map(file => uploadFile(file, bucket, path));
  return Promise.all(uploadPromises);
}
