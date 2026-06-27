import { supabase } from './supabase'

/**
 * Загрузка файла в Supabase Storage
 * Замена: base44.integrations.Core.UploadFile({ file })
 * Возвращает: { file_url: string }
 */
export async function uploadFile(file, bucket = 'uploads') {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { file_url: data.publicUrl }
}
