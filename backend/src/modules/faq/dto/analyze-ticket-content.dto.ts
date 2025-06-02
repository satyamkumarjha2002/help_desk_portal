import { IsString, IsOptional, IsArray } from 'class-validator';

export class AnalyzeTicketContentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export interface FaqSuggestionResult {
  shouldRedirectToFaq: boolean;
  confidence: number;
  suggestedQuestion: string;
  reasoning: string;
  relevantDocuments: Array<{
    id: string;
    title: string;
    summary?: string;
    relevanceScore: number;
  }>;
} 