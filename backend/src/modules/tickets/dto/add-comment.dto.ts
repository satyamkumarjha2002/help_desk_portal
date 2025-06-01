import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, Length, IsObject } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[]; // Firebase Storage file IDs
} 