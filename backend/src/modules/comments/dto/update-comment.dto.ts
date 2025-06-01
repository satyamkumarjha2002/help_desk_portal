import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
} 