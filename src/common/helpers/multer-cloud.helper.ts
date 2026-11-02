import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const multerCloudConfig = {
  storage: memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2,
    fields: 10,
    parts: 12,
  },

  fileFilter: (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid image format. Only JPG, PNG and WEBP are allowed.',
        ),
        false,
      );
    }

    callback(null, true);
  },
};
