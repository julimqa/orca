import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { Request, Response } from 'express';
import { logger } from '../lib/logger';

// 업로드 디렉토리 설정
const uploadDir = 'uploads/images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const router = express.Router();

// 이미지 업로드 API
router.post('/image', authenticateToken, upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'upload_image_error');
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
    });
  }
});

// Multer / validation errors should be 4xx, not 500
router.use((err: unknown, req: Request, res: Response, next: (e?: unknown) => void) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof Error) {
    // fileFilter errors land here as Error
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  return next(err);
});

export default router;
