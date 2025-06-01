import { IsString, IsNotEmpty, IsOptional, IsUUID, Length, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
} 