import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTicketFromFaqDto {
  @IsString()
  @IsNotEmpty()
  interactionId: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string; // Additional context user wants to add
} 