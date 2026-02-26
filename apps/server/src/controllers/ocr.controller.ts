import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ocrService } from '../services/ocr.service';
import { AppError } from '../middleware/errorHandler';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'JPEG 또는 PNG 이미지만 업로드할 수 있습니다.'));
    }
  },
});

export const ocrUpload = upload.single('image');

export const ocrController = {
  async parse(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'NO_IMAGE', '이미지를 업로드해주세요.');
      }

      const profileId = req.body.profileId;
      if (!profileId) {
        throw new AppError(400, 'NO_PROFILE', '프로필을 선택해주세요.');
      }

      const result = await ocrService.parseImage(
        profileId,
        req.file.buffer,
        req.file.mimetype,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
