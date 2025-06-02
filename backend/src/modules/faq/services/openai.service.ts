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

interface FaqToTicketRequest {
  faqQuestion: string;
  faqResponse: string;
  confidence: number;
  sourceDocuments: Array<{ title: string; content: string }>;
  feedback?: string;
  feedbackComment?: string;
  additionalInfo?: string;
  departments: Array<{ id: string; name: string; description?: string }>;
  categories: Array<{ id: string; name: string; description?: string; departmentName: string }>;
  priorities: Array<{ id: string; name: string; level: number }>;
}

interface FaqToTicketResult {
  title: string;
  description: string;
  priorityId: string | null;
  categoryId: string | null;
  departmentId: string | null;
  tags: string[];
  confidence: {
    title: number;
    description: number;
    classification: number;
  };
  reasoning: string;
}

interface TicketToFaqRequest {
  ticketTitle: string;
  ticketDescription: string;
  ticketComments: Array<{
    content: string;
    isInternal: boolean;
    commentType: string;
    createdAt: string;
    userRole?: string;
    userName?: string;
  }>;
  ticketMetadata: {
    category?: string;
    department?: string;
    priority?: string;
    tags: string[];
    ticketNumber: string;
    createdAt: string;
    resolvedAt: string;
  };
}

interface TicketToFaqResult {
  isSuitable: boolean;
  suitabilityScore: number; // 0-1 scale
  reasoning: string;
  suggestedFaqDocument?: {
    title: string;
    content: string;
    summary: string;
    tags: string[];
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

  /**
   * Generate ticket creation data from FAQ interaction
   */
  async generateTicketFromFaq(request: FaqToTicketRequest): Promise<FaqToTicketResult> {
    if (!this.apiKey) {
      return this.getFallbackTicketData(request);
    }

    try {
      const systemPrompt = this.buildFaqToTicketSystemPrompt(request);
      const userPrompt = this.buildFaqToTicketUserPrompt(request);

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

      const response = await this.callOpenAI(messages, 1500, 0.3);
      return this.parseFaqToTicketResponse(response, request);
    } catch (error) {
      this.logger.error('Failed to generate ticket from FAQ:', error);
      return this.getFallbackTicketData(request);
    }
  }

  private buildFaqToTicketSystemPrompt(request: FaqToTicketRequest): string {
    const departmentList = request.departments.map(d => 
      `- ${d.name} (ID: ${d.id})${d.description ? `: ${d.description}` : ''}`
    ).join('\n');

    const categoryList = request.categories.map(c => 
      `- ${c.name} (ID: ${c.id}, Department: ${c.departmentName})${c.description ? `: ${c.description}` : ''}`
    ).join('\n');

    const priorityList = request.priorities.map(p => 
      `- ${p.name} (ID: ${p.id}, Level: ${p.level})`
    ).join('\n');

    return `You are a help desk assistant that converts FAQ interactions into support tickets when the FAQ system couldn't adequately resolve a user's issue.

Your task is to:
1. Analyze the FAQ interaction (original question, AI response, confidence, user feedback)
2. Create a clear, actionable support ticket
3. Classify the ticket appropriately

Available Departments:
${departmentList}

Available Categories:
${categoryList}

Available Priorities:
${priorityList}

Guidelines for Ticket Creation:
- Title: Create a concise, specific title that captures the core issue
- Description: Provide context from the FAQ interaction plus clear next steps needed
- Classification: Choose department/category/priority based on the unresolved issue
- Tags: Include relevant tags like 'faq-escalation', 'unresolved', plus topic-specific tags

Priority Guidelines:
- Level 1 (Low): General questions, how-to requests
- Level 2 (Medium): Standard technical issues, account problems
- Level 3 (High): Business-impacting issues, urgent requests
- Level 4 (Critical): System outages, security concerns, blocking issues

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Clear, specific ticket title",
  "description": "Detailed description including FAQ context and next steps needed",
  "priorityId": "selected_priority_id_or_null",
  "categoryId": "selected_category_id_or_null",
  "departmentId": "selected_department_id_or_null",
  "tags": ["faq-escalation", "topic1", "topic2"],
  "confidence": {
    "title": 0.85,
    "description": 0.90,
    "classification": 0.75
  },
  "reasoning": "Brief explanation of ticket creation and classification choices"
}`;
  }

  private buildFaqToTicketUserPrompt(request: FaqToTicketRequest): string {
    const sections = [
      `Original FAQ Question: ${request.faqQuestion}`,
      `AI Response: ${request.faqResponse}`,
      `Response Confidence: ${Math.round((request.confidence || 0) * 100)}%`,
    ];

    if (request.sourceDocuments && request.sourceDocuments.length > 0) {
      sections.push('Referenced Documents:');
      request.sourceDocuments.forEach((doc, index) => {
        sections.push(`${index + 1}. ${doc.title}`);
      });
    }

    if (request.feedback) {
      sections.push(`User Feedback: ${request.feedback}`);
      if (request.feedbackComment) {
        sections.push(`Feedback Details: ${request.feedbackComment}`);
      }
    }

    if (request.additionalInfo) {
      sections.push(`Additional Information from User: ${request.additionalInfo}`);
    }

    return sections.join('\n\n');
  }

  private parseFaqToTicketResponse(response: string, request: FaqToTicketRequest): FaqToTicketResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate classification fields
      const departmentValid = !parsed.departmentId || request.departments.some(d => d.id === parsed.departmentId);
      const categoryValid = !parsed.categoryId || request.categories.some(c => c.id === parsed.categoryId);
      const priorityValid = !parsed.priorityId || request.priorities.some(p => p.id === parsed.priorityId);

      return {
        title: parsed.title || `Help needed with: ${request.faqQuestion.substring(0, 50)}...`,
        description: parsed.description || this.generateFallbackDescription(request),
        priorityId: priorityValid ? parsed.priorityId : null,
        categoryId: categoryValid ? parsed.categoryId : null,
        departmentId: departmentValid ? parsed.departmentId : null,
        tags: Array.isArray(parsed.tags) ? ['faq-escalation', ...parsed.tags.filter(tag => typeof tag === 'string')] : ['faq-escalation', 'unresolved'],
        confidence: {
          title: Math.min(Math.max(parsed.confidence?.title || 0.7, 0), 1),
          description: Math.min(Math.max(parsed.confidence?.description || 0.7, 0), 1),
          classification: Math.min(Math.max(parsed.confidence?.classification || 0.5, 0), 1),
        },
        reasoning: parsed.reasoning || 'Generated from FAQ escalation'
      };
    } catch (error) {
      this.logger.error('Failed to parse FAQ to ticket response:', error);
      return this.getFallbackTicketData(request);
    }
  }

  private getFallbackTicketData(request: FaqToTicketRequest): FaqToTicketResult {
    return {
      title: `Support needed: ${request.faqQuestion.substring(0, 60)}...`,
      description: this.generateFallbackDescription(request),
      priorityId: null,
      categoryId: null,
      departmentId: null,
      tags: ['faq-escalation', 'unresolved', 'manual-review'],
      confidence: {
        title: 0.6,
        description: 0.8,
        classification: 0.0,
      },
      reasoning: 'Fallback ticket generation due to AI service unavailability'
    };
  }

  private generateFallbackDescription(request: FaqToTicketRequest): string {
    const sections = [
      'This ticket was created from an FAQ interaction that could not be fully resolved.',
      '',
      '--- ORIGINAL QUESTION ---',
      request.faqQuestion,
      '',
      '--- FAQ SYSTEM RESPONSE ---',
      request.faqResponse,
      '',
      `--- RESPONSE CONFIDENCE ---`,
      `${Math.round((request.confidence || 0) * 100)}%`,
    ];

    if (request.sourceDocuments && request.sourceDocuments.length > 0) {
      sections.push('', '--- REFERENCED DOCUMENTS ---');
      request.sourceDocuments.forEach((doc, index) => {
        sections.push(`${index + 1}. ${doc.title}`);
      });
    }

    if (request.feedback) {
      sections.push('', '--- USER FEEDBACK ---', `Type: ${request.feedback}`);
      if (request.feedbackComment) {
        sections.push(`Comment: ${request.feedbackComment}`);
      }
    }

    if (request.additionalInfo) {
      sections.push('', '--- ADDITIONAL INFORMATION ---', request.additionalInfo);
    }

    sections.push('', '--- NEXT STEPS ---');
    sections.push('Please review this case and provide personalized assistance to resolve the user\'s inquiry.');

    return sections.join('\n');
  }

  /**
   * Analyze a resolved ticket to determine if it's suitable for FAQ creation
   */
  async analyzeTicketForFaq(request: TicketToFaqRequest): Promise<TicketToFaqResult> {
    if (!this.apiKey) {
      return this.getFallbackTicketAnalysis(request);
    }

    try {
      const systemPrompt = this.buildTicketAnalysisSystemPrompt();
      const userPrompt = this.buildTicketAnalysisUserPrompt(request);

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

      const response = await this.callOpenAI(messages, 2000, 0.3);
      return this.parseTicketAnalysisResponse(response, request);
    } catch (error) {
      this.logger.error('Failed to analyze ticket for FAQ:', error);
      return this.getFallbackTicketAnalysis(request);
    }
  }

  private buildTicketAnalysisSystemPrompt(): string {
    return `You are an AI assistant that analyzes resolved support tickets to determine if they should be converted into FAQ documents for a knowledge base.

Your job is to:
1. Analyze the ticket content (title, description, comments, resolution)
2. Determine if this ticket represents a common issue that would benefit others
3. If suitable, generate a clean FAQ document with proper structure

SUITABILITY CRITERIA:
✅ GOOD for FAQ:
- Common technical issues with clear solutions
- How-to questions with step-by-step answers
- Feature explanations or usage questions
- Troubleshooting problems with reproducible solutions
- Policy clarifications that apply to many users
- Issues that likely to recur for other users

❌ NOT SUITABLE for FAQ:
- Highly specific personal issues (individual account problems)
- One-time data fixes or manual interventions
- Issues requiring custom development
- Sensitive information or security-related problems
- Very technical backend issues that only affect specific users
- Incomplete or unresolved issues

FAQ DOCUMENT STRUCTURE:
- Title: Clear, searchable question format ("How to..." or "Why does...")
- Content: Problem description + step-by-step solution
- Summary: Brief overview of the issue and resolution
- Tags: Relevant keywords for search

RESPOND with a JSON object in this exact format:
{
  "isSuitable": true/false,
  "suitabilityScore": 0.85,
  "reasoning": "Brief explanation of why it is/isn't suitable",
  "suggestedFaqDocument": {
    "title": "How to solve [specific problem]",
    "content": "## Problem\\n\\nDescription of the issue...\\n\\n## Solution\\n\\n1. Step one...\\n2. Step two...",
    "summary": "Brief summary of the issue and solution",
    "tags": ["tag1", "tag2", "tag3"]
  }
}

If not suitable, omit the "suggestedFaqDocument" field.`;
  }

  private buildTicketAnalysisUserPrompt(request: TicketToFaqRequest): string {
    const sections = [
      `Ticket: ${request.ticketMetadata.ticketNumber}`,
      `Title: ${request.ticketTitle}`,
      `Description: ${request.ticketDescription}`,
      '',
      '--- TICKET METADATA ---',
      `Category: ${request.ticketMetadata.category || 'N/A'}`,
      `Department: ${request.ticketMetadata.department || 'N/A'}`,
      `Priority: ${request.ticketMetadata.priority || 'N/A'}`,
      `Tags: ${request.ticketMetadata.tags.join(', ') || 'None'}`,
      `Created: ${request.ticketMetadata.createdAt}`,
      `Resolved: ${request.ticketMetadata.resolvedAt}`,
      '',
      '--- CONVERSATION HISTORY ---',
    ];

    // Add comments in chronological order
    request.ticketComments.forEach((comment, index) => {
      const userInfo = comment.userName ? ` (${comment.userName}${comment.userRole ? `, ${comment.userRole}` : ''})` : '';
      const visibility = comment.isInternal ? ' [INTERNAL]' : '';
      
      sections.push(`${index + 1}. ${comment.createdAt}${userInfo}${visibility}:`);
      sections.push(comment.content);
      sections.push('');
    });

    return sections.join('\n');
  }

  private parseTicketAnalysisResponse(response: string, request: TicketToFaqRequest): TicketToFaqResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      return {
        isSuitable: Boolean(parsed.isSuitable),
        suitabilityScore: Math.min(Math.max(parsed.suitabilityScore || 0, 0), 1),
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggestedFaqDocument: parsed.suggestedFaqDocument ? {
          title: parsed.suggestedFaqDocument.title || request.ticketTitle,
          content: parsed.suggestedFaqDocument.content || 'Content generation failed',
          summary: parsed.suggestedFaqDocument.summary || 'Summary generation failed',
          tags: Array.isArray(parsed.suggestedFaqDocument.tags) 
            ? parsed.suggestedFaqDocument.tags.filter(tag => typeof tag === 'string')
            : ['auto-generated']
        } : undefined
      };
    } catch (error) {
      this.logger.error('Failed to parse ticket analysis response:', error);
      return this.getFallbackTicketAnalysis(request);
    }
  }

  private getFallbackTicketAnalysis(request: TicketToFaqRequest): TicketToFaqResult {
    // Simple heuristic for fallback
    const hasMultipleComments = request.ticketComments.length > 2;
    const hasResolution = request.ticketComments.some(c => 
      c.commentType === 'STATUS_CHANGE' || 
      c.content.toLowerCase().includes('resolved') ||
      c.content.toLowerCase().includes('solution')
    );
    
    const isSuitable = hasMultipleComments && hasResolution;
    
    return {
      isSuitable,
      suitabilityScore: isSuitable ? 0.6 : 0.2,
      reasoning: 'Fallback analysis due to AI service unavailability',
      suggestedFaqDocument: isSuitable ? {
        title: `How to resolve: ${request.ticketTitle}`,
        content: `## Problem\n\n${request.ticketDescription}\n\n## Solution\n\nPlease refer to ticket ${request.ticketMetadata.ticketNumber} for the resolution details.`,
        summary: `Resolution for: ${request.ticketTitle}`,
        tags: ['auto-generated', 'needs-review']
      } : undefined
    };
  }
} 