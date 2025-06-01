import { IsUUID, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class AssignTicketDto {
  @IsUUID()
  @IsNotEmpty()
  assigneeId: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string; // Optional comment when assigning
} 