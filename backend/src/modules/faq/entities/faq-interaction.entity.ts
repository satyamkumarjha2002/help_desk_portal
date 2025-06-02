import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Document } from './document.entity';

export enum FeedbackType {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  PARTIALLY_HELPFUL = 'partially_helpful',
}

@Entity('faq_interactions')
export class FaqInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  question: string;

  @Column('text')
  response: string;

  @Column({ type: 'enum', enum: FeedbackType, nullable: true })
  feedback: FeedbackType | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  feedbackComment: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number;

  @Column({ type: 'int', default: 0 })
  responseTimeMs: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: string | null;

  @ManyToMany(() => Document)
  @JoinTable({
    name: 'faq_interaction_documents',
    joinColumn: { name: 'interactionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'documentId', referencedColumnName: 'id' },
  })
  sourceDocuments: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 