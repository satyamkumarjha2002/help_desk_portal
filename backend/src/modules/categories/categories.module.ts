import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from '../../entities/category.entity';
import { Department } from '../../entities/department.entity';

/**
 * Categories Module
 * 
 * Provides category management functionality including CRUD operations,
 * department association, and authorization.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Department]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {} 