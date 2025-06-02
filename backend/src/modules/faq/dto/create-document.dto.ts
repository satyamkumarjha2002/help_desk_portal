import { IsNotEmpty, IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
} 