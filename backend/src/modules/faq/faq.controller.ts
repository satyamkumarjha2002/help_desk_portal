import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { UserRole } from '../../entities/user.entity';
import { User } from '../../entities/user.entity';
import { FaqService, FAQResponse } from './services/faq.service';
import { FileProcessorService } from './services/file-processor.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ProvideFeedbackDto } from './dto/feedback.dto';
import { Document } from './entities/document.entity';
import { FaqInteraction } from './entities/faq-interaction.entity';

@Controller('faq')
@UseGuards(FirebaseAuthGuard)
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly fileProcessorService: FileProcessorService,
  ) {}

  // Public FAQ endpoints - available to all authenticated users
  @Post('ask')
  async askQuestion(
    @Body() askQuestionDto: AskQuestionDto,
    @Request() req: any,
  ): Promise<FAQResponse> {
    const user: User = req.user;
    return await this.faqService.askQuestion(askQuestionDto, user);
  }

  @Post('feedback')
  async provideFeedback(@Body() feedbackDto: ProvideFeedbackDto): Promise<FaqInteraction> {
    return await this.faqService.provideFeedback(feedbackDto);
  }

  @Get('documents')
  async getPublicDocuments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ documents: Document[]; total: number; pages: number }> {
    return await this.faqService.getAllDocuments(page, Math.min(limit, 50));
  }

  @Get('documents/:id')
  async getDocument(@Param('id') id: string): Promise<Document> {
    return await this.faqService.getDocumentById(id);
  }

  // Admin-only endpoints for document management
  @Post('documents')
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: any,
  ): Promise<Document> {
    const user: User = req.user;
    
    // Only admins and super admins can create documents
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to create documents');
    }
    
    return await this.faqService.createDocument(createDocumentDto, user);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Request() req: any,
    @Body('summary') summary?: string,
    @Body('tags') tags?: string,
  ): Promise<Document> {
    const user: User = req.user;
    
    // Only admins and super admins can upload documents
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to upload documents');
    }
    
    // Validate file for text extraction
    const validation = this.fileProcessorService.validateFileForTextExtraction(file);
    if (!validation.valid) {
      throw new ForbiddenException(validation.message);
    }
    
    // Extract text content safely using the file processor service
    const content = await this.fileProcessorService.extractTextContent(file);
    
    const createDocumentDto: CreateDocumentDto = {
      title: title || file.originalname,
      content,
      summary,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      tags: tags ? JSON.parse(tags) : [],
    };

    return await this.faqService.createDocument(createDocumentDto, user);
  }

  @Put('documents/:id')
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateDocumentDto>,
    @Request() req: any,
  ): Promise<Document> {
    const user: User = req.user;
    
    // Only admins and super admins can update documents
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to update documents');
    }
    
    return await this.faqService.updateDocument(id, updateDto);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    const user: User = req.user;
    
    // Only admins and super admins can delete documents
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to delete documents');
    }
    
    await this.faqService.deleteDocument(id);
    return { message: 'Document deleted successfully' };
  }

  // Analytics endpoints for admins
  @Get('analytics')
  async getAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Request() req: any,
  ): Promise<any> {
    const user: User = req.user;
    
    // Only admins and super admins can view analytics
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view analytics');
    }
    
    return await this.faqService.getAnalytics(days);
  }
} 