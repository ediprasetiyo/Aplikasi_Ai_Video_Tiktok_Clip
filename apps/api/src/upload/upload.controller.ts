import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  presignUploadInputSchema,
  type PresignUploadInput,
} from '@tiktok-clip/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { isValidVideoMagic, MAGIC_PREFIX_BYTES } from '../storage/magic-bytes';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

const finalizeSchema = z.object({
  key: z.string().min(1).max(512),
  contentType: presignUploadInputSchema.shape.contentType,
});

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  @Post('presign')
  async presign(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(presignUploadInputSchema)) input: PresignUploadInput,
  ) {
    return this.storage.presignUpload({
      userId: user.id,
      contentType: input.contentType,
      contentLength: input.size,
    });
  }

  /**
   * Called by the client after the PUT to R2 completes.
   * Server-side magic-bytes check confirms the upload is actually a video.
   * If invalid, the object is deleted immediately.
   */
  @Post('finalize')
  async finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(finalizeSchema)) input: z.infer<typeof finalizeSchema>,
    @Req() req: Request,
  ) {
    // Ownership check — key path must start with user's prefix.
    if (!input.key.startsWith(`source-videos/${user.id}/`)) {
      throw new BadRequestException('Key does not belong to current user');
    }

    let head: { size: number; contentType?: string };
    try {
      head = await this.storage.head(input.key);
    } catch {
      throw new BadRequestException('Uploaded object not found');
    }

    const prefix = await this.storage.readPrefix(input.key, MAGIC_PREFIX_BYTES);
    const valid = isValidVideoMagic(prefix, input.contentType);
    if (!valid) {
      await this.storage.delete(input.key);
      await this.audit.log({
        userId: user.id,
        action: 'UPLOAD_VIDEO',
        resource: input.key,
        metadata: { rejected: true, reason: 'magic_bytes_mismatch' },
        request: req,
      });
      throw new BadRequestException('Uploaded file content does not match the claimed type');
    }

    await this.audit.log({
      userId: user.id,
      action: 'UPLOAD_VIDEO',
      resource: input.key,
      metadata: { size: head.size, contentType: input.contentType },
      request: req,
    });

    return { ok: true, key: input.key, size: head.size };
  }
}
