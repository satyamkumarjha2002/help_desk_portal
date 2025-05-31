import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Ticket } from './ticket.entity';

/**
 * Priority Entity
 * 
 * Defines different priority levels for tickets
 * (Low, Medium, High, Critical)
 */
@Entity('priorities')
export class Priority {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  /**
   * Priority level: 1=Low, 2=Medium, 3=High, 4=Critical
   */
  @Column({ type: 'int' })
  level: number;

  /**
   * Hex color code for UI display
   */
  @Column({ length: 7 })
  color: string;

  // Tickets with this priority
  @OneToMany(() => Ticket, ticket => ticket.priority)
  tickets: Ticket[];

  /**
   * Get priority description based on level
   * @returns string description of priority
   */
  getDescription(): string {
    const descriptions = {
      1: 'Low - Can be addressed in regular workflow',
      2: 'Medium - Should be addressed within SLA timeframes',
      3: 'High - Requires prompt attention',
      4: 'Critical - Immediate action required'
    };
    return descriptions[this.level] || 'Unknown priority level';
  }

  /**
   * Check if this priority requires immediate attention
   * @returns boolean indicating if urgent
   */
  isUrgent(): boolean {
    return this.level >= 3;
  }
} 