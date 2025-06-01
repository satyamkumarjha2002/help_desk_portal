import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Department } from '../../entities/department.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

/**
 * Categories Service
 * 
 * Handles category management within departments.
 * Includes CRUD operations with proper authorization.
 */
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  /**
   * Get all categories
   * 
   * @param currentUser - Current user
   * @returns Array of categories
   */
  async findAll(currentUser: User): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get categories by department
   * 
   * @param departmentId - Department ID
   * @param currentUser - Current user
   * @returns Array of categories in the department
   */
  async findByDepartment(departmentId: string, currentUser: User): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { departmentId },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get category by ID
   * 
   * @param id - Category ID
   * @param currentUser - Current user
   * @returns Category entity
   */
  async findOne(id: string, currentUser: User): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['department', 'tickets'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Create a new category
   * 
   * @param createCategoryDto - Category creation data
   * @param currentUser - Current user
   * @returns Created category
   */
  async create(createCategoryDto: CreateCategoryDto, currentUser: User): Promise<Category> {
    // Only admins can create categories
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to create categories');
    }

    // Validate department exists and is active
    const department = await this.departmentRepository.findOne({
      where: { id: createCategoryDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (!department.isActive) {
      throw new ForbiddenException('Cannot create category in inactive department');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  /**
   * Update category
   * 
   * @param id - Category ID
   * @param updateCategoryDto - Update data
   * @param currentUser - Current user
   * @returns Updated category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto, currentUser: User): Promise<Category> {
    // Only admins can update categories
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to update categories');
    }

    const category = await this.findOne(id, currentUser);

    // Validate department if being changed
    if (updateCategoryDto.departmentId && updateCategoryDto.departmentId !== category.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateCategoryDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      if (!department.isActive) {
        throw new ForbiddenException('Cannot move category to inactive department');
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  /**
   * Delete category (soft delete by deactivating)
   * 
   * @param id - Category ID
   * @param currentUser - Current user
   */
  async remove(id: string, currentUser: User): Promise<void> {
    // Only super admins can delete categories
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You do not have permission to delete categories');
    }

    const category = await this.findOne(id, currentUser);

    // Check if category has active tickets
    const activeTickets = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.tickets', 'ticket')
      .where('category.id = :id', { id })
      .andWhere('ticket.status IN (:...statuses)', { 
        statuses: ['open', 'in_progress', 'pending'] 
      })
      .getCount();

    if (activeTickets > 0) {
      throw new ForbiddenException('Cannot delete category with active tickets');
    }

    // Deactivate instead of hard delete
    category.isActive = false;
    await this.categoryRepository.save(category);
  }

  /**
   * Get active categories only
   * 
   * @param currentUser - Current user
   * @returns Array of active categories
   */
  async findActive(currentUser: User): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get active categories by department
   * 
   * @param departmentId - Department ID
   * @param currentUser - Current user
   * @returns Array of active categories in the department
   */
  async findActiveByDepartment(departmentId: string, currentUser: User): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { departmentId, isActive: true },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }
} 