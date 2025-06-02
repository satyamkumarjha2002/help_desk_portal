import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';

/**
 * Users Service
 * 
 * Provides user management functionality with proper authorization
 * based on roles and department access.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get all users (Admin/Super Admin only)
   * 
   * @param currentUser - Current authenticated user
   * @returns List of all users
   */
  async getAllUsers(currentUser: User): Promise<User[]> {
    this.logger.log(`Getting all users for user: ${currentUser.id}`);

    // Only admins and super admins can get all users
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to view all users');
    }

    const users = await this.userRepository.find({
      where: { isActive: true },
      relations: ['department'],
      order: { displayName: 'ASC' },
    });

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get users by department
   * 
   * @param departmentId - Department ID
   * @param currentUser - Current authenticated user
   * @returns List of users in the department
   */
  async getUsersByDepartment(departmentId: string, currentUser: User): Promise<User[]> {
    this.logger.log(`Getting users for department: ${departmentId} by user: ${currentUser.id}`);

    // Check access permissions
    this.checkDepartmentAccess(currentUser, departmentId);

    const users = await this.userRepository.find({
      where: { 
        departmentId,
        isActive: true 
      },
      relations: ['department'],
      order: { displayName: 'ASC' },
    });

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get users available for ticket assignment
   * 
   * @param currentUser - Current authenticated user
   * @param departmentId - Optional department filter
   * @returns List of assignable users
   */
  async getAssignableUsers(currentUser: User, departmentId?: string): Promise<User[]> {
    this.logger.log(`Getting assignable users for user: ${currentUser.id}, department: ${departmentId}`);

    let whereClause: any = {
      isActive: true,
      role: UserRole.AGENT || UserRole.TEAM_LEAD || UserRole.MANAGER || UserRole.ADMIN || UserRole.SUPER_ADMIN,
    };

    // Apply department filtering based on user permissions
    if (departmentId) {
      this.checkDepartmentAccess(currentUser, departmentId);
      whereClause.departmentId = departmentId;
    } else if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      // Non-admin users can only see users from their own department
      whereClause.departmentId = currentUser.departmentId;
    }

    // Filter out specific roles that can handle tickets
    const assignableRoles = [UserRole.AGENT, UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.role IN (:...roles)', { roles: assignableRoles })
      .andWhere(departmentId ? 'user.departmentId = :departmentId' : '1=1', 
        departmentId ? { departmentId } : {})
      .orderBy('user.displayName', 'ASC')
      .getMany();

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Search users by name or email
   * 
   * @param searchTerm - Search term
   * @param currentUser - Current authenticated user
   * @param departmentId - Optional department filter
   * @returns List of matching users
   */
  async searchUsers(searchTerm: string, currentUser: User, departmentId?: string): Promise<User[]> {
    this.logger.log(`Searching users with term: ${searchTerm} by user: ${currentUser.id}`);

    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    let whereClause: any = {
      isActive: true,
    };

    // Apply department filtering
    if (departmentId) {
      this.checkDepartmentAccess(currentUser, departmentId);
      whereClause.departmentId = departmentId;
    } else if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      whereClause.departmentId = currentUser.departmentId;
    }

    const users = await this.userRepository.find({
      where: [
        { ...whereClause, displayName: ILike(`%${searchTerm}%`) },
        { ...whereClause, email: ILike(`%${searchTerm}%`) },
      ],
      relations: ['department'],
      order: { displayName: 'ASC' },
      take: 20, // Limit results
    });

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get user by ID
   * 
   * @param userId - User ID
   * @param currentUser - Current authenticated user
   * @returns User entity
   */
  async getUserById(userId: string, currentUser: User): Promise<User> {
    this.logger.log(`Getting user: ${userId} by user: ${currentUser.id}`);

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if current user can view this user
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUser.role)) {
      // Non-admin users can only view users from their own department
      if (user.departmentId !== currentUser.departmentId) {
        throw new ForbiddenException('You do not have permission to view this user');
      }
    }

    return this.sanitizeUser(user);
  }

  /**
   * Check if user has access to a specific department
   * 
   * @param user - Current user
   * @param departmentId - Department ID to check
   */
  private checkDepartmentAccess(user: User, departmentId: string): void {
    // Super admins and system admins have access to all departments
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
      return;
    }

    // Managers and team leads can access their own department
    if ([UserRole.MANAGER, UserRole.TEAM_LEAD].includes(user.role)) {
      if (user.departmentId === departmentId) {
        return;
      }
    }

    throw new ForbiddenException('You do not have access to this department');
  }

  /**
   * Remove sensitive data from user object
   * 
   * @param user - User entity
   * @returns Sanitized user
   */
  private sanitizeUser(user: User): User {
    const { firebaseUid, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }
} 