import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, Length, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 500)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  description: string;

  @IsOptional()
  @IsUUID()
  priorityId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @Type(() => Date)
  @Transform(({ value }) => value ? new Date(value) : undefined)
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[]; // Firebase Storage file IDs
} 