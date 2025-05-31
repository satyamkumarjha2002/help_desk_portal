import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index, BeforeInsert, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Department } from './department.entity';
import { Priority } from './priority.entity';
import { Category } from './category.entity';
import { Attachment } from './attachment.entity';
import { TicketComment } from './ticket-comment.entity';

/**
 * Ticket Status Enum
 */
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

/**
 * Ticket Entity
 * 
 * Core entity representing help desk tickets.
 * Includes support for Firebase Cloud Storage attachments
 * and comprehensive ticket lifecycle management.
 */
@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique ticket identifier (HD-YYYY-NNNNNN)
   */
  @Column({ name: 'ticket_number', length: 20, unique: true })
  ticketNumber: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN
  })
  status: TicketStatus;

  /**
   * Array of tags for categorization and search
   */
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  /**
   * Custom fields stored as JSON
   */
  @Column({ name: 'custom_fields', type: 'jsonb', default: {} })
  customFields: Record<string, any>;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Foreign key columns
  @Column({ name: 'priority_id', nullable: true })
  priorityId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ name: 'requester_id' })
  requesterId: string;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId: string;

  @Column({ name: 'created_by_id' })
  createdById: string;

  // Relationships
  @ManyToOne(() => Priority, { nullable: true })
  @JoinColumn({ name: 'priority_id' })
  priority: Priority;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User, user => user.requestedTickets)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @ManyToOne(() => User, user => user.assignedTickets, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @ManyToOne(() => User, user => user.createdTickets)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  // Comments and attachments
  @OneToMany(() => TicketComment, comment => comment.ticket)
  comments: TicketComment[];

  @OneToMany(() => Attachment, attachment => attachment.ticket)
  attachments: Attachment[];

  /**
   * Generate ticket number before insert
   */
  @BeforeInsert()
  generateTicketNumber() {
    if (!this.ticketNumber) {
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      this.ticketNumber = `HD-${year}-${timestamp}`;
    }
  }

  /**
   * Check if ticket is overdue
   * @returns boolean indicating if overdue
   */
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== TicketStatus.CLOSED && this.status !== TicketStatus.RESOLVED;
  }

  /**
   * Check if ticket is open (not resolved/closed)
   * @returns boolean indicating if open
   */
  isOpen(): boolean {
    return ![TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(this.status);
  }

  /**
   * Check if ticket can be assigned
   * @returns boolean indicating if assignable
   */
  canBeAssigned(): boolean {
    return this.isOpen() && this.status !== TicketStatus.CANCELLED;
  }

  /**
   * Get ticket age in hours
   * @returns number of hours since creation
   */
  getAgeInHours(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Get formatted ticket display string
   * @returns formatted ticket string
   */
  getDisplayString(): string {
    return `${this.ticketNumber} - ${this.title}`;
  }

  /**
   * Close the ticket
   */
  close(): void {
    this.status = TicketStatus.CLOSED;
    this.closedAt = new Date();
  }

  /**
   * Resolve the ticket
   */
  resolve(): void {
    this.status = TicketStatus.RESOLVED;
  }

  /**
   * Assign ticket to a user
   * @param userId - ID of user to assign to
   */
  assignTo(userId: string): void {
    this.assigneeId = userId;
    if (this.status === TicketStatus.OPEN) {
      this.status = TicketStatus.IN_PROGRESS;
    }
  }
} 