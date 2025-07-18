// src/utils/file_handler.js
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } from '../config/index.js';

const PROJECT_TMP_DIR = path.join(process.cwd(), 'tmp');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function ensureTmpDirExists() {
  try {
    await fs.mkdir(PROJECT_TMP_DIR, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

export function getLocalVideoPath(fileId) {
  return path.join(PROJECT_TMP_DIR, `${fileId}.mp4`);
}

export async function deleteLocalFile(localPath) {
  try {
    await fs.unlink(localPath);
  } catch (err) {
    // Ignore if file does not exist
  }
}

export async function uploadToSupabase(localPath, fileId) {
  const fileBuffer = await fs.readFile(localPath);
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).upload(`${fileId}.mp4`, fileBuffer, { upsert: true, contentType: 'video/mp4' });
  if (error) throw error;
  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(`${fileId}.mp4`).data.publicUrl;
}

export async function deleteFromSupabase(fileId) {
  await supabase.storage.from(SUPABASE_BUCKET).remove([`${fileId}.mp4`]);
}