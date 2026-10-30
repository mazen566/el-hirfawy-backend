import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerCloudConfig = {
  storage: memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 2,
  },

  fileFilter: (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      return callback(
        new BadRequestException('Only JPEG, PNG and WEBP images are allowed'),
        false,
      );
    }

    callback(null, true);
  },
};
