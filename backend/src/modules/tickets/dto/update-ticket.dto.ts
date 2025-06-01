import { IsString, IsOptional, IsUUID, IsArray, Length, IsObject, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TicketStatus } from '../../../entities/ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @Length(5, 500)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 5000)
  description?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

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
  @IsUUID()
  assigneeId?: string;

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
} 