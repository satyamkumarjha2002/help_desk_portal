import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

/**
 * Departments Controller
 * 
 * Handles all department-related HTTP endpoints with proper authentication
 * and authorization using Firebase Auth Guard.
 * 
 * Note: /departments/active endpoint is public to support user registration.
 */
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * Get all departments
   * GET /departments
   */
  @Get()
  @UseGuards(FirebaseAuthGuard)
  async findAll(@Request() req: any) {
    return this.departmentsService.findAll(req.user);
  }

  /**
   * Get active departments only (PUBLIC - used during registration)
   * GET /departments/active
   * 
   * Security Note: This endpoint is intentionally public to support user registration.
   * It only returns basic department information (id, name, description) for active departments.
   * No sensitive data or user information is exposed through this endpoint.
   */
  @Get('active')
  async findActive() {
    return this.departmentsService.findActive();
  }

  /**
   * Get department hierarchy
   * GET /departments/hierarchy
   */
  @Get('hierarchy')
  @UseGuards(FirebaseAuthGuard)
  async getHierarchy(@Request() req: any) {
    return this.departmentsService.getHierarchy(req.user);
  }

  /**
   * Get department by ID
   * GET /departments/:id
   */
  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.departmentsService.findOne(id, req.user);
  }

  /**
   * Create a new department
   * POST /departments
   */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req: any) {
    return this.departmentsService.create(createDepartmentDto, req.user);
  }

  /**
   * Update department
   * PATCH /departments/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @Request() req: any,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto, req.user);
  }

  /**
   * Delete department
   * DELETE /departments/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.departmentsService.remove(id, req.user);
  }
} 