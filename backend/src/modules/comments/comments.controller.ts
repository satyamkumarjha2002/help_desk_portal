import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Comments Controller - Redesigned for Robustness
 * 
 * Handles all comment-related operations with comprehensive error handling,
 * standardized responses, and detailed logging for debugging.
 */
@Controller('comments')
@UseGuards(FirebaseAuthGuard)
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Add comment to ticket with enhanced error handling
   * POST /comments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Body() addCommentDto: AddCommentDto,
    @Request() req: any,
  ) {
    this.logger.log(`Adding comment to ticket: ${addCommentDto.ticketId} by user: ${req.user?.uid}`);
    
    try {
      const result = await this.commentsService.addComment(addCommentDto, req.user);
      this.logger.log(`Comment added successfully: ${result.id}`);
      
      return {
        success: true,
        data: result,
        message: 'Comment added successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to add comment: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get comments for a ticket with enhanced response
   * GET /comments/ticket/:ticketId
   */
  @Get('ticket/:ticketId')
  async getTicketComments(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Fetching comments for ticket: ${ticketId} by user: ${req.user?.uid}`);
    
    try {
      const pageNum = parseInt(page || '1');
      const limitNum = parseInt(limit || '50');
      
      const result = await this.commentsService.getTicketComments(
        ticketId, 
        req.user,
        pageNum,
        limitNum
      );
      
      this.logger.log(`Found ${result.comments.length} comments for ticket: ${ticketId}`);
      
      return {
        success: true,
        data: result.comments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
        message: `Found ${result.comments.length} comments`,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch comments for ticket ${ticketId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to retrieve comments: ${error.message}`);
    }
  }

  /**
   * Get comment by ID with attachments
   * GET /comments/:id
   */
  @Get(':id')
  async getComment(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    this.logger.log(`Fetching comment: ${id} by user: ${req.user?.uid}`);
    
    try {
      const result = await this.commentsService.getCommentById(id, req.user);
      
      return {
        success: true,
        data: result,
        message: 'Comment retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch comment ${id}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to retrieve comment: ${error.message}`);
    }
  }

  /**
   * Update comment with enhanced error handling
   * PUT /comments/:id
   */
  @Put(':id')
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    this.logger.log(`Updating comment: ${id} by user: ${req.user?.uid}`);
    
    try {
      const result = await this.commentsService.updateComment(id, updateCommentDto, req.user);
      this.logger.log(`Comment updated successfully: ${id}`);
      
      return {
        success: true,
        data: result,
        message: 'Comment updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update comment ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update comment: ${error.message}`);
    }
  }

  /**
   * Delete comment with enhanced error handling
   * DELETE /comments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteComment(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    this.logger.log(`Deleting comment: ${id} by user: ${req.user?.uid}`);
    
    try {
      await this.commentsService.deleteComment(id, req.user);
      this.logger.log(`Comment deleted successfully: ${id}`);
      
      return {
        success: true,
        message: 'Comment deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete comment ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Health check for comment service
   * GET /comments/health/check
   */
  @Get('health/check')
  async healthCheck() {
    try {
      const isHealthy = await this.commentsService.healthCheck();
      
      return {
        success: true,
        healthy: isHealthy,
        message: 'Comment service is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        success: false,
        healthy: false,
        message: 'Comment service is unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get comment statistics for a ticket
   * GET /comments/ticket/:ticketId/stats
   */
  @Get('ticket/:ticketId/stats')
  async getCommentStats(@Param('ticketId', ParseUUIDPipe) ticketId: string, @Request() req: any) {
    this.logger.log(`Fetching comment stats for ticket: ${ticketId} by user: ${req.user?.uid}`);
    
    try {
      const stats = await this.commentsService.getCommentStats(ticketId, req.user);
      
      return {
        success: true,
        data: stats,
        message: 'Comment statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch comment stats for ticket ${ticketId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to retrieve comment statistics: ${error.message}`);
    }
  }
} 