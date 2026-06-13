import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request } from 'express';
import { createJobInputSchema, type CreateJobInput } from '@tiktok-clip/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VIDEO_QUEUE } from '../queue/queue.module';

@Controller('jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(VIDEO_QUEUE) private readonly videoQueue: Queue,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createJobInputSchema)) input: CreateJobInput,
    @Req() req: Request,
  ) {
    if (input.sourceType === 'UPLOAD') {
      if (!input.sourceKey?.startsWith(`source-videos/${user.id}/`)) {
        throw new BadRequestException('Source key does not belong to current user');
      }
    }

    const job = await this.prisma.job.create({
      data: {
        userId: user.id,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        sourceKey: input.sourceKey ?? null,
        config: input.config as unknown as object,
        status: 'QUEUED',
        progress: 0,
      },
      select: { id: true, status: true, createdAt: true },
    });

    await this.videoQueue.add(
      'process-video',
      {
        jobId: job.id,
        userId: user.id,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        sourceKey: input.sourceKey,
        config: input.config,
      },
      { jobId: job.id },
    );

    await this.audit.log({
      userId: user.id,
      action: 'CREATE_JOB',
      resource: job.id,
      metadata: { sourceType: input.sourceType, config: input.config },
      request: req,
    });

    return job;
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sourceType: true,
        sourceTitle: true,
        status: true,
        progress: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
        _count: { select: { clips: true } },
      },
    });
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        clips: {
          orderBy: { viralScore: 'desc' },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            duration: true,
            viralScore: true,
            reason: true,
            hookLine: true,
            videoKey: true,
            thumbnailKey: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== user.id) throw new ForbiddenException();

    await this.prisma.job.delete({ where: { id } });
    await this.videoQueue.remove(id).catch(() => undefined);

    await this.audit.log({
      userId: user.id,
      action: 'DELETE_JOB',
      resource: id,
      request: req,
    });

    return { ok: true };
  }
}
