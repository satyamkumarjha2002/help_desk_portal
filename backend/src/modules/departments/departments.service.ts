import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

/**
 * Departments Service
 * 
 * Handles department management with hierarchical support.
 * Includes CRUD operations with proper authorization.
 */
@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  /**
   * Get all departments
   * 
   * @param currentUser - Current user
   * @returns Array of departments
   */
  async findAll(currentUser: User): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get department by ID
   * 
   * @param id - Department ID
   * @param currentUser - Current user
   * @returns Department entity
   */
  async findOne(id: string, currentUser: User): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'users', 'categories'],
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  /**
   * Create a new department
   * 
   * @param createDepartmentDto - Department creation data
   * @param currentUser - Current user
   * @returns Created department
   */
  async create(createDepartmentDto: CreateDepartmentDto, currentUser: User): Promise<Department> {
    // Only admins can create departments
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to create departments');
    }

    // Validate parent department if provided
    if (createDepartmentDto.parentId) {
      const parentDepartment = await this.departmentRepository.findOne({
        where: { id: createDepartmentDto.parentId },
      });

      if (!parentDepartment) {
        throw new NotFoundException('Parent department not found');
      }

      if (!parentDepartment.isActive) {
        throw new ForbiddenException('Cannot create department under inactive parent');
      }
    }

    const department = this.departmentRepository.create(createDepartmentDto);
    return await this.departmentRepository.save(department);
  }

  /**
   * Update department
   * 
   * @param id - Department ID
   * @param updateDepartmentDto - Update data
   * @param currentUser - Current user
   * @returns Updated department
   */
  async update(id: string, updateDepartmentDto: UpdateDepartmentDto, currentUser: User): Promise<Department> {
    // Only admins can update departments
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to update departments');
    }

    const department = await this.findOne(id, currentUser);

    // Validate parent department if provided
    if (updateDepartmentDto.parentId && updateDepartmentDto.parentId !== department.parentId) {
      const parentDepartment = await this.departmentRepository.findOne({
        where: { id: updateDepartmentDto.parentId },
      });

      if (!parentDepartment) {
        throw new NotFoundException('Parent department not found');
      }

      if (!parentDepartment.isActive) {
        throw new ForbiddenException('Cannot move department under inactive parent');
      }

      // Prevent circular references
      if (parentDepartment.id === department.id) {
        throw new ForbiddenException('Department cannot be its own parent');
      }

      if (department.isParentOf(parentDepartment)) {
        throw new ForbiddenException('Cannot create circular reference in department hierarchy');
      }
    }

    Object.assign(department, updateDepartmentDto);
    return await this.departmentRepository.save(department);
  }

  /**
   * Delete department (soft delete by deactivating)
   * 
   * @param id - Department ID
   * @param currentUser - Current user
   */
  async remove(id: string, currentUser: User): Promise<void> {
    // Only super admins can delete departments
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You do not have permission to delete departments');
    }

    const department = await this.findOne(id, currentUser);

    // Check if department has active children
    const activeChildren = await this.departmentRepository.count({
      where: { parentId: id, isActive: true },
    });

    if (activeChildren > 0) {
      throw new ForbiddenException('Cannot delete department with active child departments');
    }

    // Check if department has active users
    const activeUsers = await this.departmentRepository
      .createQueryBuilder('department')
      .leftJoin('department.users', 'user')
      .where('department.id = :id', { id })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();

    if (activeUsers > 0) {
      throw new ForbiddenException('Cannot delete department with active users');
    }

    // Deactivate instead of hard delete
    department.isActive = false;
    await this.departmentRepository.save(department);
  }

  /**
   * Get department hierarchy
   * 
   * @param currentUser - Current user
   * @returns Tree structure of departments
   */
  async getHierarchy(currentUser: User): Promise<any[]> {
    const allDepartments = await this.departmentRepository.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });

    // Build tree structure
    const departmentMap = new Map();
    const roots: any[] = [];

    // First pass: create map and identify roots
    allDepartments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
      if (!dept.parentId) {
        roots.push(departmentMap.get(dept.id));
      }
    });

    // Second pass: build hierarchy
    allDepartments.forEach(dept => {
      if (dept.parentId && departmentMap.has(dept.parentId)) {
        departmentMap.get(dept.parentId).children.push(departmentMap.get(dept.id));
      }
    });

    return roots;
  }

  /**
   * Get active departments only
   * 
   * @param currentUser - Current user
   * @returns Array of active departments
   */
  async findActive(currentUser: User): Promise<Department[]> {
    return this.departmentRepository.find({
      where: { isActive: true },
      relations: ['parent'],
      order: { name: 'ASC' },
    });
  }
} 