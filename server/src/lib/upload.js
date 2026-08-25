import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.join(__dirname, '../../uploads');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subdir) {
  const dest = path.join(uploadsRoot, subdir);
  ensureDir(dest);

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, name);
    },
  });
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('Only JPEG, PNG, WebP, or GIF images are allowed', 400));
  }
  cb(null, true);
}

export function createUploader(subdir) {
  return multer({
    storage: makeStorage(subdir),
    limits: { fileSize: MAX_BYTES },
    fileFilter,
  });
}

/** Public path stored in DB, e.g. /uploads/avatars/123.jpg */
export function publicUploadPath(subdir, filename) {
  return `/uploads/${subdir}/${filename}`;
}

export function handleMulterError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Image must be 5MB or smaller', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
}
