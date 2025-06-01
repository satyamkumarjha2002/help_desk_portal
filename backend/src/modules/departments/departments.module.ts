import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { Department } from '../../entities/department.entity';
import { User } from '../../entities/user.entity';

/**
 * Departments Module
 * 
 * Provides department management functionality including CRUD operations,
 * hierarchical structure support, and authorization.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Department, User]),
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {} 