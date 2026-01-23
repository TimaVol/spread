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

export async function uploadPhotoToSupabase(fileBuffer, filename, mediaType = 'photo') {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filename, fileBuffer, { 
      upsert: true, 
      contentType: 'image/png',
      metadata: { 
        mediaType,
      },
    });
  if (error) throw error;
  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename).data.publicUrl;
}

export function detectMediaType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const photoExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
  
  if (photoExtensions.includes(ext)) return 'photo';
  if (videoExtensions.includes(ext)) return 'video';
  return 'unknown';
}

export async function getMediaInfo(filename) {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list('', { 
      limit: 1000,
    });
  
  if (error) throw error;
  
  const fileInfo = data.find(f => f.name === filename);
  if (!fileInfo) return null;
  
  return {
    filename: fileInfo.name,
    mediaType: detectMediaType(fileInfo.name),
    uploadedAt: fileInfo.created_at,
  };
}

export async function listQueuedMedia() {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list('', { limit: 1, sortBy: { column: 'created_at', order: 'asc' } });
  if (error) throw error;
  
  if (data.length === 0) return null;
  
  const file = data[0];
  return {
    filename: file.name,
    mediaType: detectMediaType(file.name),
    uploadedAt: file.created_at,
  };
}
