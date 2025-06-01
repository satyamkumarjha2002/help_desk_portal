import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../../entities/attachment.entity';
import { Ticket } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { User, UserRole } from '../../entities/user.entity';
import { FirebaseConfig } from '../../config/firebase.config';

/**
 * Attachments Service
 * 
 * Handles file upload and attachment management with Firebase Cloud Storage.
 * Supports both ticket attachments and comment attachments.
 */
@Injectable()
export class AttachmentsService {
  private readonly allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Video/Audio (limited)
    'video/mp4',
    'audio/mpeg',
    'audio/wav',
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
  ) {}

  /**
   * Upload file to Firebase Storage and create attachment record
   * 
   * @param file - File to upload
   * @param currentUser - Current user
   * @param ticketId - Optional ticket ID
   * @param commentId - Optional comment ID
   * @returns Created attachment
   */
  async uploadFile(
    file: Express.Multer.File,
    currentUser: User,
    ticketId?: string,
    commentId?: string,
  ): Promise<Attachment> {
    // Validate file
    this.validateFile(file);

    // Validate ticket or comment exists and user has access
    if (ticketId) {
      await this.validateTicketAccess(ticketId, currentUser);
    }
    if (commentId) {
      await this.validateCommentAccess(commentId, currentUser);
    }

    try {
      // Upload to Firebase Storage
      const { downloadUrl, storagePath } = await this.uploadToFirebaseStorage(
        file,
        currentUser.id,
        ticketId,
        commentId,
      );

      // Create attachment record with correct property names
      const attachmentData: Partial<Attachment> = {
        originalFilename: file.originalname,
        firebasePath: storagePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: currentUser.id,
        ...(ticketId && { ticketId }),
        ...(commentId && { commentId }),
      };

      const attachment = this.attachmentRepository.create(attachmentData);

      return await this.attachmentRepository.save(attachment);
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   * 
   * @param files - Files to upload
   * @param currentUser - Current user
   * @param ticketId - Optional ticket ID
   * @param commentId - Optional comment ID
   * @returns Array of created attachments
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    currentUser: User,
    ticketId?: string,
    commentId?: string,
  ): Promise<Attachment[]> {
    const attachments: Attachment[] = [];

    for (const file of files) {
      const attachment = await this.uploadFile(file, currentUser, ticketId, commentId);
      attachments.push(attachment);
    }

    return attachments;
  }

  /**
   * Get attachment by ID
   * 
   * @param id - Attachment ID
   * @param currentUser - Current user
   * @returns Attachment with download URL
   */
  async findOne(id: string, currentUser: User): Promise<Attachment & { downloadUrl: string }> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
      relations: ['ticket', 'comment', 'uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Check access permissions
    if (attachment.ticketId) {
      await this.validateTicketAccess(attachment.ticketId, currentUser);
    }
    if (attachment.commentId) {
      await this.validateCommentAccess(attachment.commentId, currentUser);
    }

    // Generate download URL
    const downloadUrl = await this.generateDownloadUrl(attachment.firebasePath);

    return Object.assign(attachment, { downloadUrl });
  }

  /**
   * Delete attachment
   * 
   * @param id - Attachment ID
   * @param currentUser - Current user
   */
  async remove(id: string, currentUser: User): Promise<void> {
    const attachment = await this.findOne(id, currentUser);

    // Check if user can delete this attachment
    if (
      attachment.uploadedById !== currentUser.id &&
      ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)
    ) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    try {
      // Delete from Firebase Storage
      await this.deleteFromFirebaseStorage(attachment.firebasePath);

      // Delete from database
      await this.attachmentRepository.remove(attachment);
    } catch (error) {
      throw new BadRequestException(`Failed to delete attachment: ${error.message}`);
    }
  }

  /**
   * Get attachments for a ticket
   * 
   * @param ticketId - Ticket ID
   * @param currentUser - Current user
   * @returns Array of attachments
   */
  async findByTicket(ticketId: string, currentUser: User): Promise<Attachment[]> {
    await this.validateTicketAccess(ticketId, currentUser);

    return this.attachmentRepository.find({
      where: { ticketId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get attachments for a comment
   * 
   * @param commentId - Comment ID
   * @param currentUser - Current user
   * @returns Array of attachments
   */
  async findByComment(commentId: string, currentUser: User): Promise<Attachment[]> {
    await this.validateCommentAccess(commentId, currentUser);

    return this.attachmentRepository.find({
      where: { commentId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  private async uploadToFirebaseStorage(
    file: Express.Multer.File,
    userId: string,
    ticketId?: string,
    commentId?: string,
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const storage = FirebaseConfig.getStorage();
    const bucket = storage.bucket();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop() || '';
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${safeFilename}`;

    // Determine storage path based on attachment type
    let storagePath: string;
    if (ticketId) {
      storagePath = `tickets/${ticketId}/attachments/${fileName}`;
    } else if (commentId) {
      storagePath = `comments/${commentId}/attachments/${fileName}`;
    } else {
      storagePath = `temp/${userId}/${fileName}`;
    }

    const fileRef = bucket.file(storagePath);

    // Upload file
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=3600',
        metadata: {
          uploadedBy: userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return { downloadUrl, storagePath };
  }

  /**
   * Delete file from Firebase Storage
   */
  private async deleteFromFirebaseStorage(storagePath: string): Promise<void> {
    const storage = FirebaseConfig.getStorage();
    const bucket = storage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.delete();
  }

  /**
   * Generate download URL for file
   */
  private async generateDownloadUrl(storagePath: string): Promise<string> {
    const storage = FirebaseConfig.getStorage();
    const bucket = storage.bucket();
    const fileRef = bucket.file(storagePath);

    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  }

  /**
   * Generate public download URL for file (public method)
   */
  async generatePublicDownloadUrl(storagePath: string): Promise<string> {
    return this.generateDownloadUrl(storagePath);
  }

  /**
   * Health check for attachment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const storage = FirebaseConfig.getStorage();
      const bucket = storage.bucket();
      
      // Test basic Firebase Storage connectivity
      await bucket.exists();
      
      return true;
    } catch (error) {
      console.error('Attachment service health check failed:', error);
      return false;
    }
  }

  /**
   * Validate user access to ticket
   */
  private async validateTicketAccess(ticketId: string, currentUser: User): Promise<void> {
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
  }

  /**
   * Validate user access to comment
   */
  private async validateCommentAccess(commentId: string, currentUser: User): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['ticket', 'ticket.requester', 'ticket.assignee'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate access to the parent ticket
    await this.validateTicketAccess(comment.ticketId, currentUser);
  }
}