import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{
    public_id: string;
    secure_url: string;
  }> {
    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder,
            public_id: randomUUID(),
            overwrite: false,
          },
          (error, result) => {
            if (error) return reject(error);

            if (!result)
              return reject(new Error('Cloudinary returned no result'));

            resolve(result);
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
      };
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);

      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);

      throw new InternalServerErrorException('Failed to delete image');
    }
  }
}
