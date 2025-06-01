import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketComment, CommentType } from '../../entities/ticket-comment.entity';
import { Ticket } from '../../entities/ticket.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Attachment } from '../../entities/attachment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Comments Service - Redesigned for Robustness
 * 
 * Handles all comment-related operations with comprehensive error handling,
 * validation, and business logic.
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Add comment to ticket with enhanced validation
   */
  async addComment(addCommentDto: AddCommentDto, currentUser: User): Promise<TicketComment> {
    // Validate ticket exists and user has access
    const ticket = await this.validateTicketAccess(addCommentDto.ticketId, currentUser);

    // Validate comment content
    this.validateCommentContent(addCommentDto.content);

    try {
      const comment = this.commentRepository.create({
        content: addCommentDto.content,
        isInternal: addCommentDto.isInternal || false,
        commentType: addCommentDto.type || CommentType.COMMENT,
        metadata: addCommentDto.metadata || {},
        ticketId: ticket.id,
        userId: currentUser.id,
      });

      const savedComment = await this.commentRepository.save(comment);

      // Load comment with all relations including attachments
      const fullComment = await this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['user', 'attachments', 'attachments.uploadedBy'],
      });

      if (!fullComment) {
        throw new NotFoundException('Comment not found after creation');
      }

      // Send notifications for regular comments
      if (addCommentDto.type === CommentType.COMMENT) {
        await this.sendCommentNotifications(ticket, fullComment, currentUser);
      }

      return fullComment;
    } catch (error) {
      throw new BadRequestException(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get comments for a ticket with pagination
   */
  async getTicketComments(
    ticketId: string,
    currentUser: User,
    page: number = 1,
    limit: number = 50
  ): Promise<{ comments: TicketComment[]; total: number }> {
    // Validate ticket access
    await this.validateTicketAccess(ticketId, currentUser);

    // Validate pagination parameters
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { ticketId },
      relations: ['user', 'attachments', 'attachments.uploadedBy'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { comments, total };
  }

  /**
   * Get comment by ID with full relations
   */
  async getCommentById(commentId: string, currentUser: User): Promise<TicketComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'attachments', 'attachments.uploadedBy', 'ticket'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate access to the parent ticket
    await this.validateTicketAccess(comment.ticketId, currentUser);

    return comment;
  }

  /**
   * Update comment with validation
   */
  async updateComment(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    currentUser: User
  ): Promise<TicketComment> {
    const comment = await this.getCommentById(commentId, currentUser);

    // Check if user can edit this comment
    if (comment.userId !== currentUser.id && ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Validate comment content if provided
    if (updateCommentDto.content) {
      this.validateCommentContent(updateCommentDto.content);
    }

    // Update comment fields
    if (updateCommentDto.content !== undefined) {
      comment.content = updateCommentDto.content;
    }
    if (updateCommentDto.isInternal !== undefined) {
      comment.isInternal = updateCommentDto.isInternal;
    }

    const updatedComment = await this.commentRepository.save(comment);

    // Return comment with relations
    return this.getCommentById(updatedComment.id, currentUser);
  }

  /**
   * Delete comment with validation
   */
  async deleteComment(commentId: string, currentUser: User): Promise<void> {
    const comment = await this.getCommentById(commentId, currentUser);

    // Check if user can delete this comment
    if (comment.userId !== currentUser.id && ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Don't allow deletion of system comments
    if (comment.isSystemComment()) {
      throw new BadRequestException('System comments cannot be deleted');
    }

    await this.commentRepository.remove(comment);
  }

  /**
   * Get comment statistics for a ticket
   */
  async getCommentStats(ticketId: string, currentUser: User): Promise<any> {
    // Validate ticket access
    await this.validateTicketAccess(ticketId, currentUser);

    const stats = await this.commentRepository
      .createQueryBuilder('comment')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN comment.commentType = :commentType THEN 1 END) as userComments',
        'COUNT(CASE WHEN comment.commentType != :commentType THEN 1 END) as systemComments',
        'COUNT(CASE WHEN comment.isInternal = true THEN 1 END) as internalComments',
        'COUNT(DISTINCT comment.userId) as uniqueUsers',
      ])
      .where('comment.ticketId = :ticketId', { ticketId })
      .setParameter('commentType', CommentType.COMMENT)
      .getRawOne();

    // Get recent activity
    const recentComments = await this.commentRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      total: parseInt(stats.total),
      userComments: parseInt(stats.userComments),
      systemComments: parseInt(stats.systemComments),
      internalComments: parseInt(stats.internalComments),
      uniqueUsers: parseInt(stats.uniqueUsers),
      recentActivity: recentComments.map(comment => ({
        id: comment.id,
        type: comment.commentType,
        user: comment.user?.displayName || 'Unknown',
        createdAt: comment.createdAt,
        preview: comment.content.substring(0, 100),
      })),
    };
  }

  /**
   * Health check for comment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test database connectivity
      await this.commentRepository.count();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate comment content
   */
  private validateCommentContent(content: string): void {
    if (!content || !content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    if (content.length > 5000) {
      throw new BadRequestException('Comment content cannot exceed 5000 characters');
    }

    if (content.length < 1) {
      throw new BadRequestException('Comment content must be at least 1 character');
    }
  }

  /**
   * Validate user access to ticket
   */
  private async validateTicketAccess(ticketId: string, currentUser: User): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['requester', 'assignee'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if user has access to this ticket
    const hasAccess =
      ticket.requesterId === currentUser.id ||
      ticket.assigneeId === currentUser.id ||
      [UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Send notifications when a comment is added
   */
  private async sendCommentNotifications(
    ticket: Ticket,
    comment: TicketComment,
    commenter: User
  ): Promise<void> {
    try {
      const notifyUsers: User[] = [];

      // Notify the requester (if not the commenter)
      if (ticket.requester && ticket.requester.id !== commenter.id) {
        notifyUsers.push(ticket.requester);
      }

      // Notify the assignee (if exists and not the commenter)
      if (ticket.assignee && ticket.assignee.id !== commenter.id) {
        notifyUsers.push(ticket.assignee);
      }

      // Get unique users from previous comments (excluding the current commenter)
      const previousCommenters = await this.commentRepository
        .createQueryBuilder('comment')
        .leftJoin('comment.user', 'user')
        .where('comment.ticketId = :ticketId', { ticketId: ticket.id })
        .andWhere('comment.userId != :currentUserId', { currentUserId: commenter.id })
        .andWhere('comment.commentType = :type', { type: CommentType.COMMENT })
        .select('user.id')
        .distinct(true)
        .getRawMany();

      for (const prevCommenter of previousCommenters) {
        const user = await this.userRepository.findOne({ where: { id: prevCommenter.user_id } });
        if (user && !notifyUsers.some(u => u.id === user.id)) {
          notifyUsers.push(user);
        }
      }

      // Send notifications
      if (notifyUsers.length > 0) {
        const commentPreview = comment.content.length > 100 
          ? comment.content.substring(0, 100) + '...' 
          : comment.content;
          
        await this.notificationsService.notifyTicketCommented(
          ticket, 
          notifyUsers, 
          commenter, 
          commentPreview
        );
      }
    } catch (error) {
      // Don't throw error for notification failures
    }
  }
} 