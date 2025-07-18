// src/utils/file_handler.js
import fs from 'fs/promises';
import path from 'path';

const PROJECT_TMP_DIR = path.join(process.cwd(), 'tmp');

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