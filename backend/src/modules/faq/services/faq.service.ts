import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Document } from '../entities/document.entity';
import { FaqInteraction, FeedbackType } from '../entities/faq-interaction.entity';
import { User } from '../../../entities/user.entity';
import { Department } from '../../../entities/department.entity';
import { Category } from '../../../entities/category.entity';
import { Priority } from '../../../entities/priority.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { AskQuestionDto } from '../dto/ask-question.dto';
import { ProvideFeedbackDto } from '../dto/feedback.dto';
import { CreateTicketFromFaqDto } from '../dto/create-ticket-from-faq.dto';
import { OpenAIService } from './openai.service';

export interface FAQResponse {
  answer: string;
  confidence: number;
  sources: Document[];
  interactionId: string;
  responseTimeMs: number;
}

export interface SearchResult {
  document: Document;
  relevanceScore: number;
}

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(FaqInteraction)
    private interactionRepository: Repository<FaqInteraction>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Priority)
    private priorityRepository: Repository<Priority>,
    private openAIService: OpenAIService,
  ) {}

  // Document Management
  async createDocument(createDocumentDto: CreateDocumentDto, uploadedBy: User): Promise<Document> {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      uploadedBy,
      uploadedById: uploadedBy.id,
    });

    return await this.documentRepository.save(document);
  }

  async getAllDocuments(page = 1, limit = 50): Promise<{ documents: Document[]; total: number; pages: number }> {
    const [documents, total] = await this.documentRepository.findAndCount({
      where: { isActive: true },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      documents,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getDocumentById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, isActive: true },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async updateDocument(id: string, updateData: Partial<CreateDocumentDto>): Promise<Document> {
    const document = await this.getDocumentById(id);
    
    Object.assign(document, updateData);
    return await this.documentRepository.save(document);
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocumentById(id);
    document.isActive = false;
    await this.documentRepository.save(document);
  }

  // FAQ Question Answering
  async askQuestion(askQuestionDto: AskQuestionDto, user?: User): Promise<FAQResponse> {
    const startTime = Date.now();
    
    try {
      // Search for relevant documents
      const searchResults = await this.searchDocuments(askQuestionDto.question);
      
      if (searchResults.length === 0) {
        return this.createNoResultsResponse(askQuestionDto.question, user, startTime);
      }

      // Prepare context from relevant documents
      const context = this.prepareContext(searchResults);
      
      // Generate AI response
      const aiResponse = await this.openAIService.generateFAQResponse(
        askQuestionDto.question,
        context
      );

      // Calculate confidence based on search results
      const confidence = this.calculateConfidence(searchResults);
      
      // Save interaction
      const interaction = await this.saveInteraction(
        askQuestionDto.question,
        aiResponse,
        confidence,
        Date.now() - startTime,
        user,
        searchResults.map(r => r.document)
      );

      // Update document usage counts
      await this.updateDocumentUsage(searchResults.map(r => r.document.id));

      return {
        answer: aiResponse,
        confidence,
        sources: searchResults.map(r => r.document),
        interactionId: interaction.id,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error in askQuestion:', error);
      throw new BadRequestException('Failed to process question');
    }
  }

  private async searchDocuments(query: string, limit = 5): Promise<SearchResult[]> {
    // Simple text search - can be enhanced with better algorithms
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }

    // Search in title and content
    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.isActive = :isActive', { isActive: true })
      .andWhere(
        searchTerms.map((term, index) => 
          `(LOWER(document.title) LIKE :term${index} OR LOWER(document.content) LIKE :term${index})`
        ).join(' OR '),
        searchTerms.reduce((params, term, index) => {
          params[`term${index}`] = `%${term}%`;
          return params;
        }, {})
      )
      .orderBy('document.usageCount', 'DESC')
      .addOrderBy('document.createdAt', 'DESC')
      .take(limit)
      .getMany();

    // Calculate simple relevance scores
    return documents.map(doc => ({
      document: doc,
      relevanceScore: this.calculateRelevanceScore(doc, searchTerms),
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRelevanceScore(document: Document, searchTerms: string[]): number {
    const title = document.title.toLowerCase();
    const content = document.content.toLowerCase();
    let score = 0;

    searchTerms.forEach(term => {
      // Title matches are weighted higher
      const titleMatches = (title.match(new RegExp(term, 'g')) || []).length;
      const contentMatches = (content.match(new RegExp(term, 'g')) || []).length;
      
      score += titleMatches * 3 + contentMatches;
    });

    // Factor in usage count (popular documents get slight boost)
    score += Math.min(document.usageCount * 0.1, 2);

    return score;
  }

  private prepareContext(searchResults: SearchResult[]): string {
    return searchResults
      .map(result => `Title: ${result.document.title}\nContent: ${result.document.content}\n`)
      .join('\n---\n');
  }

  private calculateConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;
    
    const maxScore = Math.max(...searchResults.map(r => r.relevanceScore));
    const avgScore = searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length;
    
    // Normalize to 0-1 scale, considering both max and average scores
    return Math.min(((maxScore + avgScore) / 2) / 10, 1);
  }

  private async createNoResultsResponse(question: string, user?: User, startTime?: number): Promise<FAQResponse> {
    const response = `I couldn't find specific information to answer your question: "${question}".

This might be because:
- The topic isn't covered in our current knowledge base
- Different keywords might yield better results
- The question might be too specific or too general

I recommend:
1. Try rephrasing your question with different keywords
2. Browse our knowledge base manually
3. Contact our support team for personalized assistance
4. Create a support ticket for detailed help`;

    const interaction = await this.saveInteraction(
      question,
      response,
      0,
      startTime ? Date.now() - startTime : 0,
      user,
      []
    );

    return {
      answer: response,
      confidence: 0,
      sources: [],
      interactionId: interaction.id,
      responseTimeMs: startTime ? Date.now() - startTime : 0,
    };
  }

  private async saveInteraction(
    question: string,
    response: string,
    confidence: number,
    responseTimeMs: number,
    user?: User,
    sourceDocuments: Document[] = []
  ): Promise<FaqInteraction> {
    const interaction = this.interactionRepository.create({
      question,
      response,
      confidence,
      responseTimeMs,
      user: user || null,
      userId: user?.id || null,
      sourceDocuments,
    });

    return await this.interactionRepository.save(interaction);
  }

  private async updateDocumentUsage(documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) return;

    await this.documentRepository
      .createQueryBuilder()
      .update(Document)
      .set({ usageCount: () => 'usageCount + 1' })
      .where('id IN (:...ids)', { ids: documentIds })
      .execute();
  }

  // Feedback Management
  async provideFeedback(feedbackDto: ProvideFeedbackDto): Promise<FaqInteraction> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: feedbackDto.interactionId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    interaction.feedback = feedbackDto.feedback;
    interaction.feedbackComment = feedbackDto.comment || null;

    return await this.interactionRepository.save(interaction);
  }

  // Analytics
  async getAnalytics(days = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const totalInteractions = await this.interactionRepository.count({
      where: { createdAt: { $gte: since } as any },
    });

    const feedbackStats = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.feedback', 'feedback')
      .addSelect('COUNT(*)', 'count')
      .where('interaction.createdAt >= :since', { since })
      .andWhere('interaction.feedback IS NOT NULL')
      .groupBy('interaction.feedback')
      .getRawMany();

    const avgResponseTime = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('AVG(interaction.responseTimeMs)', 'avgTime')
      .where('interaction.createdAt >= :since', { since })
      .getRawOne();

    const popularDocuments = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.isActive = :isActive', { isActive: true })
      .orderBy('document.usageCount', 'DESC')
      .take(10)
      .getMany();

    return {
      period: `Last ${days} days`,
      totalInteractions,
      feedbackStats,
      avgResponseTimeMs: parseInt(avgResponseTime?.avgTime || '0'),
      popularDocuments,
    };
  }

  // Ticket Creation from FAQ
  /**
   * Create a ticket from FAQ interaction
   * This method generates ticket data using AI and returns the formatted data
   * The actual ticket creation will be handled by the tickets service in the controller
   */
  async generateTicketFromFaqInteraction(
    createTicketDto: CreateTicketFromFaqDto,
    user: User,
  ): Promise<any> {
    // Get the FAQ interaction with all related data
    const interaction = await this.interactionRepository.findOne({
      where: { id: createTicketDto.interactionId },
      relations: ['sourceDocuments', 'user'],
    });

    if (!interaction) {
      throw new NotFoundException('FAQ interaction not found');
    }

    // Get all available departments, categories, and priorities for AI classification
    const [departments, categories, priorities] = await Promise.all([
      this.departmentRepository.find({ 
        where: { isActive: true },
        select: ['id', 'name', 'description']
      }),
      this.categoryRepository.find({ 
        where: { isActive: true },
        relations: ['department'],
        select: ['id', 'name', 'description']
      }),
      this.priorityRepository.find({
        select: ['id', 'name', 'level']
      })
    ]);

    // Prepare data for AI ticket generation
    const faqToTicketRequest = {
      faqQuestion: interaction.question,
      faqResponse: interaction.response,
      confidence: interaction.confidence || 0,
      sourceDocuments: interaction.sourceDocuments?.map(doc => ({
        title: doc.title,
        content: doc.content
      })) || [],
      feedback: interaction.feedback || undefined,
      feedbackComment: interaction.feedbackComment || undefined,
      additionalInfo: createTicketDto.additionalInfo,
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        departmentName: c.department?.name || 'Unknown'
      })),
      priorities: priorities.map(p => ({
        id: p.id,
        name: p.name,
        level: p.level
      }))
    };

    // Use AI to generate ticket creation data
    const ticketData = await this.openAIService.generateTicketFromFaq(faqToTicketRequest);

    // Add metadata to track the FAQ connection
    const customFields = {
      faqInteractionId: interaction.id,
      faqQuestion: interaction.question,
      faqConfidence: interaction.confidence,
      createdFromFaq: true,
      aiGeneratedTicket: true,
      aiConfidence: ticketData.confidence,
      aiReasoning: ticketData.reasoning,
    };

    // Return the formatted ticket creation data
    const result = {
      title: ticketData.title,
      description: ticketData.description,
      priorityId: ticketData.priorityId,
      categoryId: ticketData.categoryId,
      departmentId: ticketData.departmentId,
      tags: ticketData.tags,
      customFields,
    };

    this.logger.log(`Generated ticket data from FAQ interaction ${interaction.id} for user ${user.id}`);

    return result;
  }

  /**
   * Get FAQ interaction details for ticket creation preview
   */
  async getFaqInteractionForTicket(interactionId: string): Promise<FaqInteraction> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
      relations: ['sourceDocuments', 'user'],
    });

    if (!interaction) {
      throw new NotFoundException('FAQ interaction not found');
    }

    return interaction;
  }

  /**
   * Analyze a resolved ticket and potentially create an FAQ document
   */
  async processResolvedTicketForFaq(ticket: any, user: User): Promise<{ created: boolean; document?: any; analysis?: any }> {
    try {
      // Prepare ticket data for analysis
      const ticketToFaqRequest = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        ticketComments: ticket.comments?.map(comment => ({
          content: comment.content,
          isInternal: comment.isInternal || false,
          commentType: comment.commentType || 'COMMENT',
          createdAt: comment.createdAt,
          userRole: comment.user?.role,
          userName: comment.user?.displayName || comment.user?.email,
        })) || [],
        ticketMetadata: {
          category: ticket.category?.name,
          department: ticket.department?.name,
          priority: ticket.priority?.name,
          tags: ticket.tags || [],
          ticketNumber: ticket.ticketNumber,
          createdAt: ticket.createdAt,
          resolvedAt: new Date().toISOString(), // Current time as resolution time
        },
      };

      // Analyze ticket with AI
      const analysis = await this.openAIService.analyzeTicketForFaq(ticketToFaqRequest);

      this.logger.log(`Analyzed ticket ${ticket.ticketNumber} for FAQ suitability: ${analysis.isSuitable} (score: ${analysis.suitabilityScore})`);

      // Only create FAQ if suitable and score is high enough
      if (analysis.isSuitable && analysis.suitabilityScore >= 0.7 && analysis.suggestedFaqDocument) {
        try {
          // Create the FAQ document
          const documentDto = {
            title: analysis.suggestedFaqDocument.title,
            content: analysis.suggestedFaqDocument.content,
            summary: analysis.suggestedFaqDocument.summary,
            tags: [
              ...analysis.suggestedFaqDocument.tags,
              'auto-generated',
              'from-ticket',
              ticket.ticketNumber
            ],
            originalFileName: `ticket-${ticket.ticketNumber}.txt`,
            mimeType: 'text/plain',
            fileSize: analysis.suggestedFaqDocument.content.length,
          };

          const document = await this.createDocument(documentDto, user);

          this.logger.log(`Created FAQ document ${document.id} from ticket ${ticket.ticketNumber}`);

          return {
            created: true,
            document,
            analysis,
          };
        } catch (error) {
          this.logger.error(`Failed to create FAQ document from ticket ${ticket.ticketNumber}:`, error);
          return {
            created: false,
            analysis,
          };
        }
      }

      return {
        created: false,
        analysis,
      };
    } catch (error) {
      this.logger.error(`Failed to process ticket ${ticket.ticketNumber} for FAQ:`, error);
      return {
        created: false,
        analysis: {
          isSuitable: false,
          suitabilityScore: 0,
          reasoning: `Processing failed: ${error.message}`,
        },
      };
    }
  }

  /**
   * Get tickets that have been converted to FAQ documents
   */
  async getTicketsConvertedToFaq(): Promise<any[]> {
    const documents = await this.documentRepository.find({
      where: { isActive: true },
      select: ['id', 'title', 'tags', 'createdAt'],
    });

    // Filter documents that were created from tickets
    return documents
      .filter(doc => doc.tags.some(tag => tag.startsWith('HD-'))) // Ticket numbers start with HD-
      .map(doc => ({
        documentId: doc.id,
        documentTitle: doc.title,
        ticketNumber: doc.tags.find(tag => tag.startsWith('HD-')),
        createdAt: doc.createdAt,
      }));
  }
} 