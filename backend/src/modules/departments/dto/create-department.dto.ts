import { IsString, IsNotEmpty, IsOptional, IsUUID, Length, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
} 