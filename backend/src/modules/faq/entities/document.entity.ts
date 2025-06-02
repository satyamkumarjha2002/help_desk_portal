import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../entities/user.entity';

@Entity('faq_documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column('text')
  content: string;

  @Column({ length: 2000, nullable: true })
  summary: string;

  @Column({ length: 255, nullable: true })
  originalFileName: string;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 