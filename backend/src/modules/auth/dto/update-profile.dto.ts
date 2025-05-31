import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsObject } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

/**
 * Update Profile DTO
 * 
 * Data Transfer Object for updating user profile
 * All fields are optional for partial updates
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'Department ID must be a string' })
  departmentId?: string;

  @IsOptional()
  @IsObject({ message: 'Preferences must be an object' })
  preferences?: Record<string, any>;
} 