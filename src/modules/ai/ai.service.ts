import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import axios from 'axios';
import FormData from 'form-data';

interface AiFaceMatchResponse {
  success: boolean;
  similarity_score: number;
  decision: string;
  message: string;
}

@Injectable()
export class AiVerificationService {
  async verifyIdentity(
    idImage: Express.Multer.File,
    selfieImage: Express.Multer.File,
  ): Promise<AiFaceMatchResponse> {
    const apiUrl = process.env.AI_FACE_MATCH_URL;
    const apiKey = process.env.AI_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new InternalServerErrorException('AI API configuration is missing');
    }

    const form = new FormData();

    // These are the field names expected by the AI API
    form.append('id_image', idImage.buffer, {
      filename: idImage.originalname,
      contentType: idImage.mimetype,
    });

    form.append('selfie_image', selfieImage.buffer, {
      filename: selfieImage.originalname,
      contentType: selfieImage.mimetype,
    });

    try {
      const response = await axios.post<AiFaceMatchResponse>(apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          'X-Api-Key': apiKey,
        },
        timeout: 60000,
        maxBodyLength: Infinity,
      });

      const result = response.data;

      if (
        !result.success ||
        typeof result.similarity_score !== 'number' ||
        !Number.isFinite(result.similarity_score) ||
        result.similarity_score < 0 ||
        result.similarity_score > 1
      ) {
        throw new InternalServerErrorException(
          'Invalid response from AI service',
        );
      }

      return result;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          'AI identity verification service is currently unavailable',
        );
      }

      throw error;
    }
  }
}
