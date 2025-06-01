import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterWithFileDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

/**
 * Authentication Controller
 * 
 * Handles user authentication endpoints:
 * - User registration with profile image upload
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
   * Supports optional profile image upload
   * 
   * POST /auth/register
   */
  @Post('register')
  @UseInterceptors(FileInterceptor('profileImage', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFile() profileImage?: any
  ) {
    try {
      // Prepare registration data
      const registrationData: RegisterWithFileDto = {
        email: registerDto.email,
        password: registerDto.password,
        displayName: registerDto.displayName,
        role: registerDto.role,
        departmentId: registerDto.departmentId,
      };

      // Handle profile image if uploaded
      if (profileImage) {
        // Validate file size and type
        if (profileImage.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Profile image must be smaller than 5MB');
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(profileImage.mimetype)) {
          throw new BadRequestException('Profile image must be a valid image file (JPEG, PNG, GIF, WebP)');
        }

        // Extract file extension
        const fileExtension = profileImage.originalname.split('.').pop()?.toLowerCase();
        if (!fileExtension) {
          throw new BadRequestException('Profile image must have a valid file extension');
        }

        registrationData.profileImageBuffer = profileImage.buffer;
        registrationData.profileImageExtension = fileExtension;
      }

      // Register user
      const user = await this.authService.register(
        registrationData.email,
        registrationData.password,
        registrationData.displayName,
        registrationData.role,
        registrationData.departmentId,
        registrationData.profileImageBuffer,
        registrationData.profileImageExtension
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
    } catch (error) {
      throw error; // Let NestJS handle the error response
    }
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

  /**
   * Update user profile with file upload support
   * Requires authentication
   * 
   * PATCH /auth/profile-with-image
   */
  @Patch('profile-with-image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfileWithImage(
    @Request() req, 
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/i }),
        ],
        fileIsRequired: false, // Profile image is optional
      }),
    ) profileImage?: Express.Multer.File
  ) {
    const userId = req.user.id;
    const updatedUser = await this.authService.updateProfileWithImage(userId, updateProfileDto, profileImage);

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
   * Change user password
   * Requires authentication
   * 
   * PATCH /auth/change-password
   * 
   * Note: This endpoint is currently disabled as password changes
   * are handled entirely through Firebase Auth on the frontend
   * to prevent session invalidation and automatic logout.
   */
  /*
  @Patch('change-password')
  @UseGuards(FirebaseAuthGuard)
  async changePassword(
    @Request() req, 
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    const firebaseUid = req.user.firebaseUid;
    
    await this.authService.changePassword(
      firebaseUid, 
      changePasswordDto.currentPassword, 
      changePasswordDto.newPassword
    );

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }
  */
} 