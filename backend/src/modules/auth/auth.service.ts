import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { User, UserRole } from '../../entities/user.entity';
import { FirebaseConfig } from '../../config/firebase.config';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Authentication Service
 * 
 * Handles Firebase Authentication integration and user management.
 * Provides methods for user registration, authentication, and profile management.
 * 
 * Firebase Integration:
 * - Validates Firebase Auth tokens
 * - Creates custom claims for role-based access
 * - Syncs user data between Firebase Auth and PostgreSQL
 * - Handles profile image uploads to Firebase Storage
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   * Creates user in both Firebase Auth and local database
   * Handles profile image upload to Firebase Storage
   * 
   * @param email - User email
   * @param password - User password
   * @param displayName - User display name
   * @param role - User role (optional, defaults to END_USER)
   * @param departmentId - Department ID (optional)
   * @param profileImageBuffer - Profile image buffer (optional)
   * @param profileImageExtension - Profile image file extension (optional)
   * @returns Created user
   */
  async register(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = UserRole.END_USER,
    departmentId?: string,
    profileImageBuffer?: Buffer,
    profileImageExtension?: string
  ): Promise<User> {
    this.logger.log(`Attempting to register user with email: ${email}`);
    
    try {
      // Validate input
      this.validateRegistrationInput(email, password, displayName);

      // Check if user already exists locally
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        this.logger.warn(`Registration failed: User with email ${email} already exists`);
        throw new ConflictException('User with this email already exists');
      }

      // Create user in Firebase Auth first
      const firebaseAuth = FirebaseConfig.getAuth();
      const firebaseUser = await firebaseAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      this.logger.log(`Firebase user created with UID: ${firebaseUser.uid}`);

      let profilePictureUrl: string | null = null;
      let profilePicturePath: string | null = null;

      // Handle profile image upload if provided
      if (profileImageBuffer && profileImageExtension) {
        try {
          const uploadResult = await this.uploadProfileImage(
            firebaseUser.uid,
            profileImageBuffer,
            profileImageExtension
          );
          profilePictureUrl = uploadResult.url;
          profilePicturePath = uploadResult.path;

          // Update Firebase Auth with profile picture
          await firebaseAuth.updateUser(firebaseUser.uid, {
            photoURL: profilePictureUrl,
          });

          this.logger.log(`Profile image uploaded successfully for user: ${firebaseUser.uid}`);
        } catch (uploadError) {
          this.logger.error(`Profile image upload failed for user ${firebaseUser.uid}:`, uploadError);
          // Continue with user creation even if image upload fails
          // The user can upload a profile image later
        }
      }

      // Set custom claims for role-based access
      await firebaseAuth.setCustomUserClaims(firebaseUser.uid, {
        role,
        permissions: this.getRolePermissions(role),
      });

      // Create user in local database
      const user = this.userRepository.create({
        firebaseUid: firebaseUser.uid,
        email,
        displayName,
        role,
        isActive: true,
        preferences: {},
        departmentId: departmentId || null,
        profilePictureUrl,
        profilePicturePath,
      });

      const savedUser = await this.userRepository.save(user);

      this.logger.log(`User registered successfully with ID: ${savedUser.id}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Registration failed for email ${email}:`, error);

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      // If Firebase user was created but local database save failed, we should clean up
      // This is a more advanced error handling that could be implemented
      
      throw new Error(`Failed to register user: ${error.message}`);
    }
  }

  /**
   * Upload profile image to Firebase Storage
   * Uses the specified path format: helpdeskUserProfile/{userId}.{extension}
   * 
   * @param userId - Firebase UID
   * @param imageBuffer - Image file buffer
   * @param fileExtension - File extension (png, jpg, etc.)
   * @returns Object with download URL and storage path
   */
  private async uploadProfileImage(
    userId: string,
    imageBuffer: Buffer,
    fileExtension: string
  ): Promise<{ url: string; path: string }> {
    try {
      const storage = FirebaseConfig.getStorage();
      const bucket = storage.bucket();

      // Use the specified path format: helpdeskUserProfile/{userId}.{extension}
      const fileName = `${userId}.${fileExtension.toLowerCase()}`;
      const filePath = `helpdeskUserProfile/${fileName}`;

      const file = bucket.file(filePath);

      // Upload the image
      await file.save(imageBuffer, {
        metadata: {
          contentType: this.getContentType(fileExtension),
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public download URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (error) {
      this.logger.error('Failed to upload profile image to Firebase Storage:', error);
      throw new Error(`Profile image upload failed: ${error.message}`);
    }
  }

  /**
   * Get content type based on file extension
   * 
   * @param extension - File extension
   * @returns MIME type
   */
  private getContentType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Validate registration input
   * 
   * @param email - User email
   * @param password - User password
   * @param displayName - User display name
   */
  private validateRegistrationInput(email: string, password: string, displayName: string): void {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!displayName || displayName.trim().length < 2) {
      throw new BadRequestException('Display name must be at least 2 characters long');
    }
  }

  /**
   * Verify Firebase Auth token and get user
   * 
   * @param idToken - Firebase ID token
   * @returns User entity
   */
  async verifyToken(idToken: string): Promise<User> {
    try {
      const firebaseAuth = FirebaseConfig.getAuth();
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);
      
      // Find user in local database
      const user = await this.userRepository.findOne({
        where: { firebaseUid: decodedToken.uid },
        relations: ['department'],
      });

      if (!user) {
        throw new NotFoundException('User not found in local database');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token: ' + error.message);
    }
  }

  /**
   * Update user profile with optional image upload
   * Updates both Firebase Auth and local database
   * 
   * @param userId - User ID
   * @param updateData - Data to update
   * @param profileImage - Optional profile image file
   * @returns Updated user
   */
  async updateProfileWithImage(
    userId: string, 
    updateData: UpdateProfileDto, 
    profileImage?: Express.Multer.File
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's unique
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({ 
        where: { email: updateData.email } 
      });
      if (existingUser) {
        throw new ConflictException('Email address is already in use');
      }
    }

    let profilePictureUrl = user.profilePictureUrl;
    let profilePicturePath = user.profilePicturePath;

    // Handle profile image upload if provided
    if (profileImage) {
      try {
        // Delete old profile image if exists
        if (user.profilePicturePath) {
          await this.deleteProfileImage(user.profilePicturePath);
        }

        // Upload new profile image
        const fileExtension = profileImage.originalname.split('.').pop();
        if (!fileExtension) {
          throw new Error('Invalid file extension');
        }
        const uploadResult = await this.uploadProfileImage(
          user.firebaseUid,
          profileImage.buffer,
          fileExtension
        );
        
        profilePictureUrl = uploadResult.url;
        profilePicturePath = uploadResult.path;

        this.logger.log(`Profile image updated for user: ${user.firebaseUid}`);
      } catch (uploadError) {
        this.logger.error(`Profile image upload failed for user ${user.firebaseUid}:`, uploadError);
        throw new Error(`Profile image upload failed: ${uploadError.message}`);
      }
    }

    // Prepare update data with new image URLs if uploaded
    const finalUpdateData = {
      ...updateData,
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
      ...(profilePicturePath !== undefined && { profilePicturePath })
    };

    // Update Firebase Auth if display name, email, or photo URL changed
    const firebaseAuth = FirebaseConfig.getAuth();
    const updatePayload: any = {};
    
    if (finalUpdateData.displayName && finalUpdateData.displayName !== user.displayName) {
      updatePayload.displayName = finalUpdateData.displayName;
    }

    if (finalUpdateData.email && finalUpdateData.email !== user.email) {
      updatePayload.email = finalUpdateData.email;
    }
    
    if (profilePictureUrl && profilePictureUrl !== user.profilePictureUrl) {
      updatePayload.photoURL = profilePictureUrl;
    }
    
    if (Object.keys(updatePayload).length > 0) {
      await firebaseAuth.updateUser(user.firebaseUid, updatePayload);
    }

    // Update role claims if role changed
    if (finalUpdateData.role && finalUpdateData.role !== user.role) {
      await firebaseAuth.setCustomUserClaims(user.firebaseUid, {
        role: finalUpdateData.role,
        permissions: this.getRolePermissions(finalUpdateData.role),
      });
    }

    // Update local database
    Object.assign(user, finalUpdateData);
    return await this.userRepository.save(user);
  }

  /**
   * Update user profile (backward compatibility)
   * Updates both Firebase Auth and local database
   * 
   * @param userId - User ID
   * @param updateData - Data to update
   * @returns Updated user
   */
  async updateProfile(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update Firebase Auth if display name or photo URL changed
    if ((updateData.displayName && updateData.displayName !== user.displayName) ||
        (updateData.profilePictureUrl !== undefined && updateData.profilePictureUrl !== user.profilePictureUrl)) {
      const firebaseAuth = FirebaseConfig.getAuth();
      const updatePayload: any = {};
      
      if (updateData.displayName && updateData.displayName !== user.displayName) {
        updatePayload.displayName = updateData.displayName;
      }
      
      if (updateData.profilePictureUrl !== undefined && updateData.profilePictureUrl !== user.profilePictureUrl) {
        updatePayload.photoURL = updateData.profilePictureUrl;
      }
      
      await firebaseAuth.updateUser(user.firebaseUid, updatePayload);
    }

    // Update role claims if role changed
    if (updateData.role && updateData.role !== user.role) {
      const firebaseAuth = FirebaseConfig.getAuth();
      await firebaseAuth.setCustomUserClaims(user.firebaseUid, {
        role: updateData.role,
        permissions: this.getRolePermissions(updateData.role),
      });
    }

    // Update local database
    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }

  /**
   * Change user password
   * Updates password in Firebase Auth
   * 
   * @param firebaseUid - Firebase UID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password
   */
  async changePassword(firebaseUid: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const firebaseAuth = FirebaseConfig.getAuth();
      const user = await this.userRepository.findOne({ where: { firebaseUid } });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Note: For security, current password verification should be handled
      // on the frontend by re-authenticating the user before calling this endpoint.
      // This prevents session invalidation and provides better UX.
      
      // Update password in Firebase Auth
      await firebaseAuth.updateUser(firebaseUid, {
        password: newPassword
      });

      this.logger.log(`Password updated for user: ${firebaseUid}`);
    } catch (error) {
      this.logger.error(`Password change failed for user ${firebaseUid}:`, error);
      throw new BadRequestException('Failed to change password');
    }
  }

  /**
   * Delete user account permanently
   * Removes user from both Firebase Auth and local database
   * Also deletes profile image from Firebase Storage
   * 
   * @param userId - User ID
   * @param firebaseUid - Firebase UID
   */
  async deleteAccount(userId: string, firebaseUid: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete profile image if exists
      if (user.profilePicturePath) {
        await this.deleteProfileImage(user.profilePicturePath);
      }

      // Delete from Firebase Auth
      const firebaseAuth = FirebaseConfig.getAuth();
      await firebaseAuth.deleteUser(firebaseUid);

      // Delete from local database
      await this.userRepository.remove(user);

      this.logger.log(`Account deleted for user: ${firebaseUid}`);
    } catch (error) {
      this.logger.error(`Account deletion failed for user ${firebaseUid}:`, error);
      throw new BadRequestException('Failed to delete account');
    }
  }

  /**
   * Delete profile image from Firebase Storage
   * 
   * @param imagePath - Storage path of the image
   */
  private async deleteProfileImage(imagePath: string): Promise<void> {
    try {
      const storage = FirebaseConfig.getStorage();
      const bucket = storage.bucket();
      const file = bucket.file(imagePath);

      await file.delete();
      this.logger.log(`Profile image deleted: ${imagePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete profile image: ${imagePath}`, error);
      // Don't throw error, as this shouldn't block the update
    }
  }

  /**
   * Get user by Firebase UID
   * 
   * @param firebaseUid - Firebase UID
   * @returns User entity
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { firebaseUid },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by ID
   * 
   * @param id - User ID
   * @returns User entity
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Deactivate user account
   * 
   * @param userId - User ID
   * @returns Updated user
   */
  async deactivateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    // Disable in Firebase Auth
    const firebaseAuth = FirebaseConfig.getAuth();
    await firebaseAuth.updateUser(user.firebaseUid, {
      disabled: true,
    });

    // Deactivate in local database
    user.isActive = false;
    return await this.userRepository.save(user);
  }

  /**
   * Reactivate user account
   * 
   * @param userId - User ID
   * @returns Updated user
   */
  async reactivateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    // Enable in Firebase Auth
    const firebaseAuth = FirebaseConfig.getAuth();
    await firebaseAuth.updateUser(user.firebaseUid, {
      disabled: false,
    });

    // Reactivate in local database
    user.isActive = true;
    return await this.userRepository.save(user);
  }

  /**
   * Get role permissions for custom claims
   * 
   * @param role - User role
   * @returns Array of permissions
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissions = {
      [UserRole.SUPER_ADMIN]: ['all'],
      [UserRole.ADMIN]: ['manage_users', 'manage_system', 'view_all_tickets', 'manage_sla'],
      [UserRole.MANAGER]: ['view_team_tickets', 'assign_tickets', 'view_reports'],
      [UserRole.TEAM_LEAD]: ['view_team_tickets', 'assign_tickets'],
      [UserRole.AGENT]: ['view_assigned_tickets', 'update_tickets'],
      [UserRole.END_USER]: ['create_tickets', 'view_own_tickets'],
    };

    return permissions[role] || permissions[UserRole.END_USER];
  }

  /**
   * Sync user data from Firebase to local database
   * Used for data consistency checks
   * 
   * @param firebaseUid - Firebase UID
   * @returns Synced user
   */
  async syncUserFromFirebase(firebaseUid: string): Promise<User> {
    const firebaseAuth = FirebaseConfig.getAuth();
    const firebaseUser = await firebaseAuth.getUser(firebaseUid);
    
    let user = await this.userRepository.findOne({ where: { firebaseUid } });
    
    if (!user) {
      // Create new user if doesn't exist locally
      user = this.userRepository.create({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        role: UserRole.END_USER,
        isActive: !firebaseUser.disabled,
        preferences: {},
      });
    } else {
      // Update existing user
      user.email = firebaseUser.email!;
      user.displayName = firebaseUser.displayName || user.displayName;
      user.isActive = !firebaseUser.disabled;
    }

    return await this.userRepository.save(user);
  }
} 