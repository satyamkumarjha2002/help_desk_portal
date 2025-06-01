import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUUID, Matches } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

/**
 * Register User DTO
 * 
 * Data Transfer Object for user registration
 * Includes validation rules for secure user creation
 * Supports profile image upload and department assignment
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @IsString({ message: 'Display name must be a string' })
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  // For frontend multipart form data
  @IsOptional()
  profileImage?: any; // This will be handled as Express.Multer.File in controller
}

/**
 * Register with File DTO
 * 
 * Used internally when processing file uploads
 */
export class RegisterWithFileDto {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  departmentId?: string;
  profileImageBuffer?: Buffer;
  profileImageExtension?: string;
} 