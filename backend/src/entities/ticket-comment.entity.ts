import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Attachment } from './attachment.entity';
import { Ticket } from './ticket.entity';

/**
 * Comment Type Enum
 */
export enum CommentType {
  COMMENT = 'comment',
  STATUS_CHANGE = 'status_change',
  ASSIGNMENT = 'assignment',
  ESCALATION = 'escalation',
  REPLY = 'reply'
}

/**
 * TicketComment Entity
 * 
 * Represents comments, status changes, and other ticket activities.
 * Supports both public comments and internal notes, including threaded replies.
 */
@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @Column({
    name: 'comment_type',
    type: 'enum',
    enum: CommentType,
    default: CommentType.COMMENT
  })
  commentType: CommentType;

  /**
   * Metadata for status changes, assignments, etc.
   */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Ticket, ticket => ticket.comments, { onDelete: 'CASCADE' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => User, user => user.comments, { nullable: true })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  // Attachments on this comment
  @OneToMany(() => Attachment, attachment => attachment.comment)
  attachments: Attachment[];

  // Reply functionality - parent-child relationship
  @ManyToOne(() => TicketComment, comment => comment.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment: TicketComment;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId: string;

  @OneToMany(() => TicketComment, comment => comment.parentComment)
  replies: TicketComment[];

  /**
   * Check if comment is system-generated
   * @returns boolean indicating if system comment
   */
  isSystemComment(): boolean {
    return this.commentType !== CommentType.COMMENT && this.commentType !== CommentType.REPLY;
  }

  /**
   * Check if this is a reply to another comment
   * @returns boolean indicating if this is a reply
   */
  isReply(): boolean {
    return !!this.parentCommentId;
  }

  /**
   * Get formatted comment display
   * @returns formatted comment string
   */
  getDisplayText(): string {
    if (this.isSystemComment()) {
      return this.getSystemCommentText();
    }
    return this.content;
  }

  /**
   * Get system comment text based on type and metadata
   * @returns formatted system comment text
   */
  private getSystemCommentText(): string {
    switch (this.commentType) {
      case CommentType.STATUS_CHANGE:
        return `Status changed from ${this.metadata.oldStatus} to ${this.metadata.newStatus}`;
      case CommentType.ASSIGNMENT:
        return `Ticket assigned to ${this.metadata.assigneeName}`;
      case CommentType.ESCALATION:
        return `Ticket escalated to ${this.metadata.escalationLevel}`;
      default:
        return this.content;
    }
  }

  /**
   * Create a status change comment
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @param userId - User making the change
   * @returns TicketComment instance
   */
  static createStatusChange(oldStatus: string, newStatus: string, userId: string): Partial<TicketComment> {
    return {
      content: `Status changed from ${oldStatus} to ${newStatus}`,
      commentType: CommentType.STATUS_CHANGE,
      isInternal: false,
      userId,
      metadata: { oldStatus, newStatus }
    };
  }

  /**
   * Create an assignment comment
   * @param assigneeName - Name of assigned user
   * @param assigneeId - ID of assigned user
   * @param userId - User making the assignment
   * @returns TicketComment instance
   */
  static createAssignment(assigneeName: string, assigneeId: string, userId: string): Partial<TicketComment> {
    return {
      content: `Ticket assigned to ${assigneeName}`,
      commentType: CommentType.ASSIGNMENT,
      isInternal: false,
      userId,
      metadata: { assigneeName, assigneeId }
    };
  }

  /**
   * Create a reply comment
   * @param content - Reply content
   * @param parentCommentId - ID of the parent comment
   * @param userId - User making the reply
   * @returns TicketComment instance
   */
  static createReply(content: string, parentCommentId: string, userId: string): Partial<TicketComment> {
    return {
      content,
      commentType: CommentType.REPLY,
      isInternal: false,
      userId,
      parentCommentId,
      metadata: { parentCommentId }
    };
  }
} 