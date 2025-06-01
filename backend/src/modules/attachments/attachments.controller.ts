import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

/**
 * Attachments Controller - Redesigned for Robustness
 * 
 * Handles all file upload and attachment management endpoints
 * with comprehensive error handling and proper response formatting.
 */
@Controller('attachments')
@UseGuards(FirebaseAuthGuard)
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * Upload single file with enhanced error handling
   * POST /attachments/upload
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId?: string,
    @Body('commentId') commentId?: string,
    @Request() req?: any,
  ) {
    this.logger.log(`Uploading file: ${file?.originalname} for user: ${req.user?.uid}, ticketId: ${ticketId}, commentId: ${commentId}`);
    
    if (!file) {
      this.logger.error('No file provided in upload request');
      throw new BadRequestException('No file provided');
    }

    try {
      const result = await this.attachmentsService.uploadFile(file, req.user, ticketId, commentId);
      this.logger.log(`File uploaded successfully: ${result.id} to path: ${result.firebasePath}`);
      
      return {
        success: true,
        data: result,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files with enhanced error handling
   * POST /attachments/upload-multiple
   */
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('ticketId') ticketId?: string,
    @Body('commentId') commentId?: string,
    @Request() req?: any,
  ) {
    this.logger.log(`Uploading ${files?.length || 0} files for user: ${req.user?.uid}, ticketId: ${ticketId}, commentId: ${commentId}`);
    
    if (!files || files.length === 0) {
      this.logger.error('No files provided in upload request');
      throw new BadRequestException('No files provided');
    }

    try {
      const results = await this.attachmentsService.uploadMultipleFiles(files, req.user, ticketId, commentId);
      this.logger.log(`${results.length} files uploaded successfully`);
      
      return {
        success: true,
        data: { attachments: results },
        message: `${results.length} files uploaded successfully`,
      };
    } catch (error) {
      this.logger.error(`Multiple file upload failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get attachment by ID with download URL
   * GET /attachments/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    this.logger.log(`Fetching attachment: ${id} for user: ${req.user?.uid}`);
    
    try {
      const result = await this.attachmentsService.findOne(id, req.user);
      
      return {
        success: true,
        data: result,
        message: 'Attachment retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch attachment ${id}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to retrieve attachment: ${error.message}`);
    }
  }

  /**
   * Get attachments for a ticket with enhanced response
   * GET /attachments/ticket/:ticketId
   */
  @Get('ticket/:ticketId')
  async findByTicket(@Param('ticketId', ParseUUIDPipe) ticketId: string, @Request() req: any) {
    this.logger.log(`Fetching attachments for ticket: ${ticketId} for user: ${req.user?.uid}`);
    
    try {
      const attachments = await this.attachmentsService.findByTicket(ticketId, req.user);
      
      // Generate download URLs for all attachments
      const attachmentsWithUrls = await Promise.all(
        attachments.map(async (attachment) => {
          const downloadUrl = await this.attachmentsService.generatePublicDownloadUrl(attachment.firebasePath);
          return {
            ...attachment,
            downloadUrl,
          };
        })
      );
      
      return {
        success: true,
        data: attachmentsWithUrls,
        count: attachmentsWithUrls.length,
        message: `Found ${attachmentsWithUrls.length} attachments`,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch attachments for ticket ${ticketId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to retrieve attachments: ${error.message}`);
    }
  }

  /**
   * Get attachments for a comment with enhanced response
   * GET /attachments/comment/:commentId
   */
  @Get('comment/:commentId')
  async findByComment(@Param('commentId', ParseUUIDPipe) commentId: string, @Request() req: any) {
    this.logger.log(`Fetching attachments for comment: ${commentId} for user: ${req.user?.uid}`);
    
    try {
      const attachments = await this.attachmentsService.findByComment(commentId, req.user);
      
      // Generate download URLs for all attachments
      const attachmentsWithUrls = await Promise.all(
        attachments.map(async (attachment) => {
          const downloadUrl = await this.attachmentsService.generatePublicDownloadUrl(attachment.firebasePath);
          return {
            ...attachment,
            downloadUrl,
          };
        })
      );
      
      return {
        success: true,
        data: attachmentsWithUrls,
        count: attachmentsWithUrls.length,
        message: `Found ${attachmentsWithUrls.length} attachments`,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch attachments for comment ${commentId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to retrieve attachments: ${error.message}`);
    }
  }

  /**
   * Delete attachment with enhanced error handling
   * DELETE /attachments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    this.logger.log(`Deleting attachment: ${id} for user: ${req.user?.uid}`);
    
    try {
      await this.attachmentsService.remove(id, req.user);
      this.logger.log(`Attachment deleted successfully: ${id}`);
      
      return {
        success: true,
        message: 'Attachment deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete attachment ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete attachment: ${error.message}`);
    }
  }

  /**
   * Health check endpoint for attachment service
   * GET /attachments/health
   */
  @Get('health/check')
  async healthCheck() {
    try {
      const isHealthy = await this.attachmentsService.healthCheck();
      
      return {
        success: true,
        healthy: isHealthy,
        message: 'Attachment service is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        success: false,
        healthy: false,
        message: 'Attachment service is unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
} 