import api from '@/lib/api';

export interface Document {
  id: string;
  title: string;
  content: string;
  summary?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  tags: string[];
  isActive: boolean;
  usageCount: number;
  uploadedBy: {
    id: string;
    displayName: string;
    email: string;
  };
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FAQResponse {
  answer: string;
  confidence: number;
  sources: Document[];
  interactionId: string;
  responseTimeMs: number;
}

export interface FaqInteraction {
  id: string;
  question: string;
  response: string;
  feedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
  feedbackComment?: string;
  confidence?: number;
  responseTimeMs: number;
  userId?: string;
  sourceDocuments: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentDto {
  title: string;
  content: string;
  summary?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  tags?: string[];
}

export interface AskQuestionDto {
  question: string;
}

export interface ProvideFeedbackDto {
  interactionId: string;
  feedback: 'helpful' | 'not_helpful' | 'partially_helpful';
  comment?: string;
}

export interface FAQAnalytics {
  period: string;
  totalInteractions: number;
  feedbackStats: Array<{
    feedback: string;
    count: number;
  }>;
  avgResponseTimeMs: number;
  popularDocuments: Document[];
}

/**
 * FAQ Service
 * 
 * Provides methods for FAQ system operations including:
 * - Asking questions and getting AI responses
 * - Managing knowledge base documents
 * - Providing feedback on responses
 * - Viewing analytics
 */
export const faqService = {
  /**
   * Ask a question and get an AI-powered response
   */
  async askQuestion(questionDto: AskQuestionDto): Promise<FAQResponse> {
    const response = await api.post('/faq/ask', questionDto);
    return response.data;
  },

  /**
   * Provide feedback on an FAQ response
   */
  async provideFeedback(feedbackDto: ProvideFeedbackDto): Promise<FaqInteraction> {
    const response = await api.post('/faq/feedback', feedbackDto);
    return response.data;
  },

  /**
   * Get all public documents (knowledge base)
   */
  async getDocuments(page = 1, limit = 10): Promise<{
    documents: Document[];
    total: number;
    pages: number;
  }> {
    const response = await api.get('/faq/documents', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get a specific document by ID
   */
  async getDocumentById(id: string): Promise<Document> {
    const response = await api.get(`/faq/documents/${id}`);
    return response.data;
  },

  /**
   * Create a new document (Admin only)
   */
  async createDocument(documentDto: CreateDocumentDto): Promise<Document> {
    const response = await api.post('/faq/documents', documentDto);
    return response.data;
  },

  /**
   * Upload a document file (Admin only)
   */
  async uploadDocument(
    file: File,
    title?: string,
    summary?: string,
    tags?: string[]
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (summary) formData.append('summary', summary);
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));

    const response = await api.post('/faq/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update a document (Admin only)
   */
  async updateDocument(id: string, updateDto: Partial<CreateDocumentDto>): Promise<Document> {
    const response = await api.put(`/faq/documents/${id}`, updateDto);
    return response.data;
  },

  /**
   * Delete a document (Admin only)
   */
  async deleteDocument(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/faq/documents/${id}`);
    return response.data;
  },

  /**
   * Get FAQ analytics (Admin only)
   */
  async getAnalytics(days: number = 30): Promise<FAQAnalytics> {
    const response = await api.get(`/faq/analytics?days=${days}`);
    return response.data;
  },

  /**
   * Search documents in the knowledge base
   */
  async searchDocuments(query: string): Promise<Document[]> {
    const response = await api.get('/faq/documents', {
      params: { search: query, limit: 20 },
    });
    return response.data.documents;
  },

  /**
   * Create a ticket from FAQ interaction
   */
  async createTicketFromFaq(data: {
    interactionId: string;
    additionalInfo?: string;
  }): Promise<any> {
    const response = await api.post('/faq/tickets', data);
    return response.data;
  },
}; 