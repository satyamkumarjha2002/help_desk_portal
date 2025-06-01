import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, Length, IsObject, IsEnum } from 'class-validator';
import { CommentType } from '../../../entities/ticket-comment.entity';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;

  @IsOptional()
  @IsEnum(CommentType)
  type?: CommentType = CommentType.COMMENT;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[]; // Firebase Storage file IDs
} 