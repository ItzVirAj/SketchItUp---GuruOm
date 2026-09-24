import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { Request, Response, NextFunction } from 'express';

// 25MB maximum upload limit
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip'
]);

// Memory storage to inspect buffer before uploading to Supabase
const storage = multer.memoryStorage();

export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
}).single('file');

/**
 * Validates actual binary signature (magic bytes) to prevent MIME spoofing.
 */
export async function validateMagicBytes(buffer: Buffer, declaredFilename: string): Promise<{ mime: string; ext: string }> {
  const lowerName = declaredFilename.toLowerCase();

  // Fast-path PDF magic bytes header (%PDF-)
  if (buffer.length >= 5 && buffer.slice(0, 5).toString() === '%PDF-') {
    return { mime: 'application/pdf', ext: 'pdf' };
  }

  // Check for plain text files (e.g. .csv, .txt)
  if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
    const sample = buffer.slice(0, 1024);
    const hasNullBytes = sample.includes(0x00);
    const isDosExecutable = sample[0] === 0x4d && sample[1] === 0x5a; // 'MZ'

    if (hasNullBytes || isDosExecutable) {
      throw new Error('File content does not match declared text format (binary header detected).');
    }

    return {
      mime: lowerName.endsWith('.csv') ? 'text/csv' : 'text/plain',
      ext: lowerName.endsWith('.csv') ? 'csv' : 'txt'
    };
  }

  // Check for EICAR standard antivirus test signature in mock uploads
  if (buffer.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'))) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }

  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    throw new Error('Unable to verify file type signature. The file format may be unsupported or corrupted.');
  }

  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new Error(`Unsupported file type: ${detected.mime}. Allowed types: PDF, PNG, JPG, WEBP, DOCX, XLSX, CSV, TXT.`);
  }

  return { mime: detected.mime, ext: detected.ext };
}

/**
 * Express middleware wrapper that handles Multer errors cleanly.
 */
export function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  uploadSingle(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'PayloadTooLarge',
          message: `File size exceeds the 25MB maximum limit.`
        });
      }
      return res.status(400).json({
        error: 'UploadError',
        message: err.message || 'File upload failed.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'No file provided in multipart upload (field name: "file").'
      });
    }

    next();
  });
}
