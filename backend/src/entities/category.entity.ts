import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { Ticket } from './ticket.entity';

/**
 * Category Entity
 * 
 * Represents ticket categories within departments
 * Used for organizing and routing tickets
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'department_id' })
  departmentId: string;

  // Relationships
  @ManyToOne(() => Department, department => department.categories)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => Ticket, ticket => ticket.category)
  tickets: Ticket[];

  /**
   * Get category display name with department
   * @returns formatted category name
   */
  getDisplayName(): string {
    return `${this.department?.name || 'Unknown'} - ${this.name}`;
  }

  /**
   * Check if category is active and can accept new tickets
   * @returns boolean indicating if active
   */
  canAcceptTickets(): boolean {
    return this.isActive && (this.department?.isActive ?? false);
  }
} 