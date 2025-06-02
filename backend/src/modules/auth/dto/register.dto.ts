import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUUID, Matches, ValidateIf, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../../entities/user.entity';

/**
 * Allowed roles for self-registration
 * Excludes ADMIN and SUPER_ADMIN roles which should only be assigned by administrators
 */
const SELF_REGISTRATION_ROLES = [
  UserRole.END_USER,
  UserRole.AGENT,
  UserRole.TEAM_LEAD,
  UserRole.MANAGER
];

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
  @IsIn(SELF_REGISTRATION_ROLES, { 
    message: 'Invalid role. Available roles: End User, Agent, Team Lead, Manager' 
  })
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    // Transform empty strings to undefined for proper optional validation
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.departmentId !== undefined)
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