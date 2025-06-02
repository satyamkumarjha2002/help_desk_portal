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

interface TicketClassificationRequest {
  title: string;
  description: string;
  departments: Array<{ id: string; name: string; description?: string }>;
  categories: Array<{ id: string; name: string; description?: string; departmentName: string }>;
  priorities: Array<{ id: string; name: string; level: number }>;
}

interface TicketClassificationResult {
  departmentId: string | null;
  categoryId: string | null;
  priorityId: string | null;
  confidence: {
    department: number;
    category: number;
    priority: number;
  };
  reasoning?: string;
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

  async classifyTicketFields(request: TicketClassificationRequest): Promise<TicketClassificationResult> {
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured. Returning null classification.');
      return {
        departmentId: null,
        categoryId: null,
        priorityId: null,
        confidence: { department: 0, category: 0, priority: 0 },
        reasoning: 'OpenAI API not configured'
      };
    }

    try {
      const systemPrompt = this.buildClassificationSystemPrompt(request);
      const userPrompt = `Ticket Title: ${request.title}\n\nTicket Description: ${request.description}`;

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      const response = await this.callOpenAI(messages, 1000, 0.3); // Higher tokens, lower temperature for classification
      return this.parseClassificationResponse(response, request);
    } catch (error) {
      this.logger.error('Failed to classify ticket fields:', error);
      return {
        departmentId: null,
        categoryId: null,
        priorityId: null,
        confidence: { department: 0, category: 0, priority: 0 },
        reasoning: `Classification failed: ${error.message}`
      };
    }
  }

  private buildClassificationSystemPrompt(request: TicketClassificationRequest): string {
    const departmentList = request.departments.map(d => 
      `- ${d.name} (ID: ${d.id})${d.description ? `: ${d.description}` : ''}`
    ).join('\n');

    const categoryList = request.categories.map(c => 
      `- ${c.name} (ID: ${c.id}, Department: ${c.departmentName})${c.description ? `: ${c.description}` : ''}`
    ).join('\n');

    const priorityList = request.priorities.map(p => 
      `- ${p.name} (ID: ${p.id}, Level: ${p.level})`
    ).join('\n');

    return `You are a help desk ticket classification assistant. Your job is to analyze ticket content and classify it into the appropriate department, category, and priority.

Available Departments:
${departmentList}

Available Categories:
${categoryList}

Available Priorities:
${priorityList}

Classification Guidelines:
1. Analyze the ticket title and description to understand the issue
2. Match the issue to the most appropriate department based on the nature of the problem
3. Select a category that best describes the specific type of issue within that department
4. Determine priority based on urgency and business impact:
   - Level 1 (Low): General questions, requests that can wait
   - Level 2 (Medium): Standard issues affecting individual users
   - Level 3 (High): Issues affecting multiple users or business operations
   - Level 4 (Critical): System outages, security issues, major business impact

Respond ONLY with a valid JSON object in this exact format:
{
  "departmentId": "selected_department_id_or_null",
  "categoryId": "selected_category_id_or_null", 
  "priorityId": "selected_priority_id_or_null",
  "confidence": {
    "department": 0.85,
    "category": 0.75,
    "priority": 0.90
  },
  "reasoning": "Brief explanation of classification choices"
}

Important:
- Use exact IDs from the provided lists
- Set confidence scores between 0.0 and 1.0
- If unsure about any field, set it to null and lower the confidence
- Ensure the category belongs to the selected department
- Keep reasoning brief but informative`;
  }

  private parseClassificationResponse(response: string, request: TicketClassificationRequest): TicketClassificationResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate that selected IDs exist in the provided options
      const departmentValid = !parsed.departmentId || request.departments.some(d => d.id === parsed.departmentId);
      const categoryValid = !parsed.categoryId || request.categories.some(c => c.id === parsed.categoryId);
      const priorityValid = !parsed.priorityId || request.priorities.some(p => p.id === parsed.priorityId);

      // If category is selected, ensure it belongs to the selected department
      let categoryDepartmentValid = true;
      if (parsed.categoryId && parsed.departmentId) {
        const selectedCategory = request.categories.find(c => c.id === parsed.categoryId);
        const selectedDepartment = request.departments.find(d => d.id === parsed.departmentId);
        if (selectedCategory && selectedDepartment) {
          // Find categories that belong to the selected department
          const departmentCategories = request.categories.filter(c => c.departmentName === selectedDepartment.name);
          categoryDepartmentValid = departmentCategories.some(c => c.id === parsed.categoryId);
        }
      }

      return {
        departmentId: departmentValid ? parsed.departmentId : null,
        categoryId: (categoryValid && categoryDepartmentValid) ? parsed.categoryId : null,
        priorityId: priorityValid ? parsed.priorityId : null,
        confidence: {
          department: Math.min(Math.max(parsed.confidence?.department || 0, 0), 1),
          category: Math.min(Math.max(parsed.confidence?.category || 0, 0), 1),
          priority: Math.min(Math.max(parsed.confidence?.priority || 0, 0), 1),
        },
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      this.logger.error('Failed to parse classification response:', error);
      return {
        departmentId: null,
        categoryId: null,
        priorityId: null,
        confidence: { department: 0, category: 0, priority: 0 },
        reasoning: 'Failed to parse AI response'
      };
    }
  }

  private async callOpenAI(messages: ChatMessage[], maxTokens: number = 500, temperature: number = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature,
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