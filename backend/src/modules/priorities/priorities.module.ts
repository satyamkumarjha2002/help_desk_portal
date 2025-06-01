import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrioritiesController } from './priorities.controller';
import { PrioritiesService } from './priorities.service';
import { Priority } from '../../entities/priority.entity';

/**
 * Priorities Module
 * 
 * Provides priority management functionality including CRUD operations
 * and authorization.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Priority]),
  ],
  controllers: [PrioritiesController],
  providers: [PrioritiesService],
  exports: [PrioritiesService],
})
export class PrioritiesModule {} 