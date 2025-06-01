import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsObject, IsUrl, ValidateIf, IsEmail } from 'class-validator';
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
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'Department ID must be a string' })
  departmentId?: string;

  @IsOptional()
  @IsObject({ message: 'Preferences must be an object' })
  preferences?: Record<string, any>;

  @IsOptional()
  @ValidateIf((o) => o.profilePictureUrl && o.profilePictureUrl.length > 0)
  @IsUrl({}, { message: 'Profile picture URL must be a valid URL' })
  profilePictureUrl?: string;

  @IsOptional()
  @ValidateIf((o) => o.profilePicturePath && o.profilePicturePath.length > 0)
  @IsString({ message: 'Profile picture path must be a string' })
  profilePicturePath?: string;
}

/**
 * Change Password DTO
 * 
 * Data Transfer Object for changing user password
 */
export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
} 