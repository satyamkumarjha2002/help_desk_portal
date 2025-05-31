import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { User, UserRole } from '../../entities/user.entity';
import { FirebaseConfig } from '../../config/firebase.config';

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
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   * Creates user in both Firebase Auth and local database
   * 
   * @param email - User email
   * @param password - User password
   * @param displayName - User display name
   * @param role - User role (optional, defaults to END_USER)
   * @returns Created user
   */
  async register(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = UserRole.END_USER
  ): Promise<User> {
    try {
      // Check if user already exists locally
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create user in Firebase Auth
      const firebaseAuth = FirebaseConfig.getAuth();
      const firebaseUser = await firebaseAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

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
      });

      const savedUser = await this.userRepository.save(user);

      return savedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Failed to register user: ' + error.message);
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
   * Update user profile
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

    // Update Firebase Auth if display name changed
    if (updateData.displayName && updateData.displayName !== user.displayName) {
      const firebaseAuth = FirebaseConfig.getAuth();
      await firebaseAuth.updateUser(user.firebaseUid, {
        displayName: updateData.displayName,
      });
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