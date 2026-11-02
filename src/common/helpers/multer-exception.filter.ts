import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Image size must not exceed 5 MB',
      LIMIT_FILE_COUNT: 'Maximum number of images exceeded',
      LIMIT_UNEXPECTED_FILE: 'Unexpected image field name',
      LIMIT_PART_COUNT: 'Too many multipart fields',
    };

    const status =
      exception.code === 'LIMIT_FILE_SIZE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      message: messages[exception.code] || 'Image upload failed',
      error: status === 413 ? 'Payload Too Large' : 'Bad Request',
    });
  }
}
