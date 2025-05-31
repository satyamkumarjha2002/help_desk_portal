import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { Attachment } from './attachment.entity';
import { Department } from './department.entity';
import { TicketComment } from './ticket-comment.entity';
import { Ticket } from './ticket.entity';

/**
 * User Entity
 * 
 * Represents all users in the help desk system including end users,
 * agents, team leads, managers, and administrators.
 * 
 * Firebase Integration:
 * - firebase_uid: Links to Firebase Authentication user
 * - Authentication handled by Firebase Auth
 * - Profile photos stored in Firebase Cloud Storage
 */
export enum UserRole {
  END_USER = 'end_user',
  AGENT = 'agent',
  TEAM_LEAD = 'team_lead',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Firebase Authentication UID
   * Links this user record to Firebase Auth user
   */
  @Column({ name: 'firebase_uid', length: 128, unique: true })
  firebaseUid: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'display_name', length: 255 })
  displayName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.END_USER
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * JSON field for user preferences
   * e.g., theme, notifications, dashboard settings
   */
  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  // Tickets where user is the requester
  @OneToMany(() => Ticket, ticket => ticket.requester)
  requestedTickets: Ticket[];

  // Tickets assigned to this user
  @OneToMany(() => Ticket, ticket => ticket.assignee)
  assignedTickets: Ticket[];

  // Tickets created by this user (could be different from requester)
  @OneToMany(() => Ticket, ticket => ticket.createdBy)
  createdTickets: Ticket[];

  // Comments made by this user
  @OneToMany(() => TicketComment, comment => comment.user)
  comments: TicketComment[];

  // Attachments uploaded by this user
  @OneToMany(() => Attachment, attachment => attachment.uploadedBy)
  attachments: Attachment[];

  /**
   * Check if user has permission for a specific action
   * @param action - The action to check permission for
   * @returns boolean indicating if user has permission
   */
  hasPermission(action: string): boolean {
    // Basic permission logic based on role
    const permissions = {
      [UserRole.SUPER_ADMIN]: ['all'],
      [UserRole.ADMIN]: ['manage_users', 'manage_system', 'view_all_tickets', 'manage_sla'],
      [UserRole.MANAGER]: ['view_team_tickets', 'assign_tickets', 'view_reports'],
      [UserRole.TEAM_LEAD]: ['view_team_tickets', 'assign_tickets'],
      [UserRole.AGENT]: ['view_assigned_tickets', 'update_tickets'],
      [UserRole.END_USER]: ['create_tickets', 'view_own_tickets']
    };

    const userPermissions = permissions[this.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(action);
  }

  /**
   * Get user's full display information
   * @returns formatted user display string
   */
  getDisplayInfo(): string {
    return `${this.displayName} (${this.email})`;
  }
} 