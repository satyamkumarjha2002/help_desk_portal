import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

/**
 * Categories Controller
 * 
 * Handles all category-related HTTP endpoints with proper authentication
 * and authorization using Firebase Auth Guard.
 */
@Controller('categories')
@UseGuards(FirebaseAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get all categories
   * GET /categories
   */
  @Get()
  async findAll(@Request() req: any) {
    return this.categoriesService.findAll(req.user);
  }

  /**
   * Get active categories only
   * GET /categories/active
   */
  @Get('active')
  async findActive(@Request() req: any) {
    return this.categoriesService.findActive(req.user);
  }

  /**
   * Get categories by department
   * GET /categories/department/:departmentId
   */
  @Get('department/:departmentId')
  async findByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ) {
    return this.categoriesService.findByDepartment(departmentId, req.user);
  }

  /**
   * Get active categories by department
   * GET /categories/department/:departmentId/active
   */
  @Get('department/:departmentId/active')
  async findActiveByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ) {
    return this.categoriesService.findActiveByDepartment(departmentId, req.user);
  }

  /**
   * Get category by ID
   * GET /categories/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.categoriesService.findOne(id, req.user);
  }

  /**
   * Create a new category
   * POST /categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: CreateCategoryDto, @Request() req: any) {
    return this.categoriesService.create(createCategoryDto, req.user);
  }

  /**
   * Update category
   * PATCH /categories/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, req.user);
  }

  /**
   * Delete category
   * DELETE /categories/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.categoriesService.remove(id, req.user);
  }
} 