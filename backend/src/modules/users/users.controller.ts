import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { User, UserRole } from '../../entities/user.entity';

/**
 * Users Controller
 * 
 * Handles user-related HTTP endpoints with proper authentication
 * and authorization for user management operations.
 */
@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users (Admin only)
   * GET /users
   */
  @Get()
  async getAllUsers(@Request() req: any) {
    const user: User = req.user;
    
    // Only admins and super admins can get all users
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view all users');
    }

    return this.usersService.getAllUsers(user);
  }

  /**
   * Get users by department
   * GET /users/department/:departmentId
   */
  @Get('department/:departmentId')
  async getUsersByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any
  ) {
    const user: User = req.user;
    return this.usersService.getUsersByDepartment(departmentId, user);
  }

  /**
   * Get users available for assignment
   * GET /users/assignable
   */
  @Get('assignable')
  async getAssignableUsers(
    @Query('departmentId') departmentId: string,
    @Request() req: any
  ) {
    const user: User = req.user;
    return this.usersService.getAssignableUsers(user, departmentId);
  }

  /**
   * Search users
   * GET /users/search
   */
  @Get('search')
  async searchUsers(
    @Query('search') search: string,
    @Query('departmentId') departmentId: string,
    @Request() req: any
  ) {
    const user: User = req.user;
    return this.usersService.searchUsers(search, user, departmentId);
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any
  ) {
    const user: User = req.user;
    return this.usersService.getUserById(id, user);
  }
} 