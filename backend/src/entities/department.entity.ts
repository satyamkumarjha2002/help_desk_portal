import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';
import { Ticket } from './ticket.entity';
import { Category } from './category.entity';

/**
 * Department Entity
 * 
 * Represents organizational departments in the help desk system.
 * Supports hierarchical structure with parent-child relationships.
 */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Self-referencing relationship for hierarchy
  @ManyToOne(() => Department, department => department.children, { nullable: true })
  parent: Department;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @OneToMany(() => Department, department => department.parent)
  children: Department[];

  // Users in this department
  @OneToMany(() => User, user => user.department)
  users: User[];

  // Tickets for this department
  @OneToMany(() => Ticket, ticket => ticket.department)
  tickets: Ticket[];

  // Categories under this department
  @OneToMany(() => Category, category => category.department)
  categories: Category[];

  /**
   * Get the full department path (for hierarchical departments)
   * @returns string representing the full path
   */
  getFullPath(): string {
    if (this.parent) {
      return `${this.parent.getFullPath()} > ${this.name}`;
    }
    return this.name;
  }

  /**
   * Check if this department is a parent of another department
   * @param department - Department to check
   * @returns boolean indicating if this is a parent
   */
  isParentOf(department: Department): boolean {
    if (!department.parent) return false;
    if (department.parent.id === this.id) return true;
    return this.isParentOf(department.parent);
  }
} 