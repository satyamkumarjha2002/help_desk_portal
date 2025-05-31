import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Login DTO
 * 
 * Data Transfer Object for user login
 * Contains Firebase ID token for authentication
 */
export class LoginDto {
  @IsString({ message: 'ID token must be a string' })
  @IsNotEmpty({ message: 'ID token is required' })
  idToken: string;
} 