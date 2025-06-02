import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './faq.controller';
import { FaqService } from './services/faq.service';
import { OpenAIService } from './services/openai.service';
import { FileProcessorService } from './services/file-processor.service';
import { Document } from './entities/document.entity';
import { FaqInteraction } from './entities/faq-interaction.entity';
import { Department } from '../../entities/department.entity';
import { Category } from '../../entities/category.entity';
import { Priority } from '../../entities/priority.entity';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, FaqInteraction, Department, Category, Priority]),
    ConfigModule,
    forwardRef(() => TicketsModule),
  ],
  controllers: [FaqController],
  providers: [FaqService, OpenAIService, FileProcessorService],
  exports: [FaqService],
})
export class FaqModule {} 