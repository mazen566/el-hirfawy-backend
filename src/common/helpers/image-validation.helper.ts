import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

const MAX_WIDTH = 6000;
const MAX_HEIGHT = 6000;

export async function validateImage(file: Express.Multer.File): Promise<void> {
  if (!file || !file.buffer) {
    throw new BadRequestException('Image file is required');
  }

  try {
    const metadata = await sharp(file.buffer).metadata();

    if (
      !metadata.format ||
      !['jpeg', 'png', 'webp'].includes(metadata.format)
    ) {
      throw new BadRequestException('Unsupported image format');
    }

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Invalid image dimensions');
    }

    if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
      throw new BadRequestException(
        'Image dimensions must not exceed 6000x6000 pixels',
      );
    }

    if (metadata.pages && metadata.pages > 1) {
      throw new BadRequestException('Animated images are not allowed');
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      'The uploaded file is corrupted or is not a valid image',
    );
  }
}
