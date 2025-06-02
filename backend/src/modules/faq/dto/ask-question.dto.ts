import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskQuestionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  question: string;
} 