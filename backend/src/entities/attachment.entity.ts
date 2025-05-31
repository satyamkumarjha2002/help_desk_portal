import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { User } from './user.entity';

/**
 * Attachment Entity
 * 
 * Represents file attachments stored in Firebase Cloud Storage.
 * Links to tickets and comments with metadata about the files.
 */
@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  /**
   * Path to file in Firebase Cloud Storage
   */
  @Column({ name: 'firebase_path', length: 500 })
  firebasePath: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Ticket, ticket => ticket.attachments, { onDelete: 'CASCADE', nullable: true })
  ticket: Ticket;

  @Column({ name: 'ticket_id', nullable: true })
  ticketId: string;

  @ManyToOne(() => TicketComment, comment => comment.attachments, { onDelete: 'CASCADE', nullable: true })
  comment: TicketComment;

  @Column({ name: 'comment_id', nullable: true })
  commentId: string;

  @ManyToOne(() => User, user => user.attachments, { nullable: true })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id', nullable: true })
  uploadedById: string;

  /**
   * Get file extension from filename
   * @returns file extension
   */
  getFileExtension(): string {
    return this.originalFilename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   * @returns boolean indicating if image
   */
  isImage(): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return imageTypes.includes(this.mimeType);
  }

  /**
   * Check if file is a document
   * @returns boolean indicating if document
   */
  isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    return documentTypes.includes(this.mimeType);
  }

  /**
   * Get human-readable file size
   * @returns formatted file size string
   */
  getFormattedFileSize(): string {
    const bytes = Number(this.fileSize);
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate Firebase Storage download URL path
   * @returns Firebase Storage path for download URL generation
   */
  getStoragePath(): string {
    return this.firebasePath;
  }

  /**
   * Check if attachment is safe to download
   * @returns boolean indicating if safe
   */
  isSafeToDownload(): boolean {
    // Basic security check - can be extended
    const dangerousTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-ms-dos-executable'
    ];
    return !dangerousTypes.includes(this.mimeType);
  }

  /**
   * Get attachment type category
   * @returns attachment type category
   */
  getTypeCategory(): string {
    if (this.isImage()) return 'image';
    if (this.isDocument()) return 'document';
    if (this.mimeType.startsWith('video/')) return 'video';
    if (this.mimeType.startsWith('audio/')) return 'audio';
    return 'other';
  }
} 