// src/utils/file_handler.js
import fs from 'fs/promises';
import path from 'path';
import { SUPABASE_BUCKET } from '../config/index.js';
import supabase from '../config/supabase.js';
import { logger } from './logger.js';

const PROJECT_TMP_DIR = path.join(process.cwd(), 'tmp');

export async function ensureTmpDirExists() {
  try {
    await fs.mkdir(PROJECT_TMP_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      logger.error('Error ensuring tmp dir exists:', err);
    }
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
    if (err.code !== 'ENOENT') {
      logger.error('Error deleting file:', localPath, err);
    }
    // Ignore if file does not exist
  }
}

export async function uploadToSupabase(fileBuffer, filename) {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filename, fileBuffer, { upsert: true, contentType: 'video/mp4' });
  if (error) throw error;
  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename).data.publicUrl;
}

export async function deleteFromSupabase(filename) {
  await supabase.storage.from(SUPABASE_BUCKET).remove([filename]);
}

export async function listQueuedVideos() {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list('', { limit: 1, sortBy: { column: 'created_at', order: 'asc' } });
  if (error) throw error;
  return data;
}
