import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

/**
 * Notification Type Enum
 */
export enum NotificationType {
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_COMMENTED = 'ticket_commented',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  SLA_WARNING = 'sla_warning',
  SLA_BREACH = 'sla_breach',
  MENTION = 'mention',
  CHAT_MESSAGE = 'chat_message',
  TICKET_CREATED = 'ticket_created',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_CLOSED = 'ticket_closed'
}

/**
 * Notification Entity
 * 
 * Stores notification metadata in PostgreSQL while using Firebase Realtime Database
 * for real-time delivery and presence management.
 */
@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  /**
   * Additional data payload (ticket ID, user ID, etc.)
   */
  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  /**
   * Firebase Realtime Database path where this notification is stored
   */
  @Column({ name: 'firebase_path', length: 500, nullable: true })
  firebasePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Get notification action URL based on type and data
   * @returns URL to navigate to when notification is clicked
   */
  getActionUrl(): string {
    switch (this.type) {
      case NotificationType.TICKET_ASSIGNED:
      case NotificationType.TICKET_UPDATED:
      case NotificationType.TICKET_COMMENTED:
      case NotificationType.TICKET_STATUS_CHANGED:
      case NotificationType.TICKET_CREATED:
      case NotificationType.TICKET_RESOLVED:
      case NotificationType.TICKET_CLOSED:
        return this.data.ticketId ? `/tickets/${this.data.ticketId}` : '/tickets';
      
      case NotificationType.SLA_WARNING:
      case NotificationType.SLA_BREACH:
        return this.data.ticketId ? `/tickets/${this.data.ticketId}` : '/dashboard';
      
      case NotificationType.MENTION:
        return this.data.ticketId 
          ? `/tickets/${this.data.ticketId}${this.data.commentId ? `#comment-${this.data.commentId}` : ''}`
          : '/tickets';
      
      case NotificationType.CHAT_MESSAGE:
        return this.data.chatId ? `/chat/${this.data.chatId}` : '/chat';
      
      default:
        return '/dashboard';
    }
  }

  /**
   * Get notification icon based on type
   * @returns Icon name for the notification type
   */
  getIcon(): string {
    switch (this.type) {
      case NotificationType.TICKET_ASSIGNED:
        return 'user-plus';
      case NotificationType.TICKET_UPDATED:
        return 'edit';
      case NotificationType.TICKET_COMMENTED:
        return 'message-circle';
      case NotificationType.TICKET_STATUS_CHANGED:
        return 'refresh-cw';
      case NotificationType.TICKET_CREATED:
        return 'plus-circle';
      case NotificationType.TICKET_RESOLVED:
        return 'check-circle';
      case NotificationType.TICKET_CLOSED:
        return 'x-circle';
      case NotificationType.SLA_WARNING:
        return 'clock';
      case NotificationType.SLA_BREACH:
        return 'alert-triangle';
      case NotificationType.MENTION:
        return 'at-sign';
      case NotificationType.CHAT_MESSAGE:
        return 'message-square';
      default:
        return 'bell';
    }
  }

  /**
   * Get notification color based on type and urgency
   * @returns Color class for the notification
   */
  getColor(): string {
    switch (this.type) {
      case NotificationType.TICKET_ASSIGNED:
        return 'blue';
      case NotificationType.TICKET_UPDATED:
        return 'yellow';
      case NotificationType.TICKET_COMMENTED:
        return 'blue';
      case NotificationType.TICKET_STATUS_CHANGED:
        return 'purple';
      case NotificationType.TICKET_CREATED:
        return 'green';
      case NotificationType.TICKET_RESOLVED:
        return 'green';
      case NotificationType.TICKET_CLOSED:
        return 'gray';
      case NotificationType.SLA_WARNING:
        return 'orange';
      case NotificationType.SLA_BREACH:
        return 'red';
      case NotificationType.MENTION:
        return 'purple';
      case NotificationType.CHAT_MESSAGE:
        return 'blue';
      default:
        return 'gray';
    }
  }

  /**
   * Check if notification is high priority
   * @returns boolean indicating if notification needs immediate attention
   */
  isHighPriority(): boolean {
    return [
      NotificationType.SLA_BREACH,
      NotificationType.SLA_WARNING,
      NotificationType.MENTION
    ].includes(this.type);
  }
} 