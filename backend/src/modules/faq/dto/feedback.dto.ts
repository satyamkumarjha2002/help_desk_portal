import { IsEnum, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { FeedbackType } from '../entities/faq-interaction.entity';

export class ProvideFeedbackDto {
  @IsUUID()
  interactionId: string;

  @IsEnum(FeedbackType)
  feedback: FeedbackType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
} 