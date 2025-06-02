import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey: string | null;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || null;
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured. FAQ responses will be limited.');
    }
  }

  async generateFAQResponse(question: string, context: string): Promise<string> {
    if (!this.apiKey) {
      return this.getFallbackResponse(question);
    }

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant for a help desk system. Your job is to answer user questions based on the provided context from our knowledge base.

Guidelines:
- Use ONLY the information provided in the context
- If the context doesn't contain enough information, say so clearly
- Be concise but comprehensive
- Maintain a professional, helpful tone
- If you're unsure, recommend contacting support

Context from knowledge base:
${context}`,
        },
        {
          role: 'user',
          content: question,
        },
      ];

      const response = await this.callOpenAI(messages);
      return response;
    } catch (error) {
      this.logger.error('Failed to generate AI response:', error);
      return this.getFallbackResponse(question);
    }
  }

  private async callOpenAI(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data: OpenAIResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return data.choices[0].message.content.trim();
  }

  private getFallbackResponse(question: string): string {
    return `Thank you for your question: "${question}". 

I apologize, but I'm currently unable to provide an AI-generated response. This could be due to:
- API configuration issues
- Temporary service unavailability

Please try again later or contact our support team directly for assistance. You can also browse our knowledge base manually or create a support ticket for personalized help.`;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
} 