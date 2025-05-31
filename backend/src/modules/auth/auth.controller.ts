import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

/**
 * Authentication Controller
 * 
 * Handles user authentication endpoints:
 * - User registration
 * - Token verification (login)
 * - Profile management
 * - Account management
 * 
 * All endpoints integrate with Firebase Authentication
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * Creates user in both Firebase Auth and local database
   * 
   * POST /auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.displayName,
      registerDto.role
    );

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = user;
    
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Verify Firebase token and authenticate user
   * 
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.verifyToken(loginDto.idToken);

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = user;

    return {
      success: true,
      message: 'Authentication successful',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Get current user profile
   * Requires authentication
   * 
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getProfile(@Request() req) {
    const user = req.user;

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = user;

    return {
      success: true,
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Update user profile
   * Requires authentication
   * 
   * PATCH /auth/profile
   */
  @Patch('profile')
  @UseGuards(FirebaseAuthGuard)
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.id;
    const updatedUser = await this.authService.updateProfile(userId, updateProfileDto);

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = updatedUser;

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Deactivate user account
   * Requires authentication and admin privileges
   * 
   * PATCH /auth/users/:id/deactivate
   */
  @Patch('users/:id/deactivate')
  @UseGuards(FirebaseAuthGuard)
  async deactivateUser(@Param('id') userId: string, @Request() req) {
    // Check if current user has admin privileges
    if (!req.user.hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    const user = await this.authService.deactivateUser(userId);

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = user;

    return {
      success: true,
      message: 'User deactivated successfully',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Reactivate user account
   * Requires authentication and admin privileges
   * 
   * PATCH /auth/users/:id/reactivate
   */
  @Patch('users/:id/reactivate')
  @UseGuards(FirebaseAuthGuard)
  async reactivateUser(@Param('id') userId: string, @Request() req) {
    // Check if current user has admin privileges
    if (!req.user.hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    const user = await this.authService.reactivateUser(userId);

    // Remove sensitive data from response
    const { firebaseUid, ...userResponse } = user;

    return {
      success: true,
      message: 'User reactivated successfully',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Sync user data from Firebase
   * Requires authentication and admin privileges
   * 
   * POST /auth/sync/:firebaseUid
   */
  @Post('sync/:firebaseUid')
  @UseGuards(FirebaseAuthGuard)
  async syncUser(@Param('firebaseUid') firebaseUid: string, @Request() req) {
    // Check if current user has admin privileges
    if (!req.user.hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    const user = await this.authService.syncUserFromFirebase(firebaseUid);

    // Remove sensitive data from response
    const { firebaseUid: uid, ...userResponse } = user;

    return {
      success: true,
      message: 'User synchronized successfully',
      data: {
        user: userResponse
      }
    };
  }

  /**
   * Health check for authentication service
   * 
   * GET /auth/health
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Authentication service is healthy',
      timestamp: new Date().toISOString()
    };
  }
} 