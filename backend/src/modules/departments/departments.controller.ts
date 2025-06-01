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
 */
@Controller('departments')
@UseGuards(FirebaseAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * Get all departments
   * GET /departments
   */
  @Get()
  async findAll(@Request() req: any) {
    return this.departmentsService.findAll(req.user);
  }

  /**
   * Get active departments only
   * GET /departments/active
   */
  @Get('active')
  async findActive(@Request() req: any) {
    return this.departmentsService.findActive(req.user);
  }

  /**
   * Get department hierarchy
   * GET /departments/hierarchy
   */
  @Get('hierarchy')
  async getHierarchy(@Request() req: any) {
    return this.departmentsService.getHierarchy(req.user);
  }

  /**
   * Get department by ID
   * GET /departments/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.departmentsService.findOne(id, req.user);
  }

  /**
   * Create a new department
   * POST /departments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req: any) {
    return this.departmentsService.create(createDepartmentDto, req.user);
  }

  /**
   * Update department
   * PATCH /departments/:id
   */
  @Patch(':id')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.departmentsService.remove(id, req.user);
  }
} 