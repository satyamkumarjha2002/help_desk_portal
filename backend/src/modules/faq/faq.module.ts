import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './faq.controller';
import { FaqService } from './services/faq.service';
import { OpenAIService } from './services/openai.service';
import { FileProcessorService } from './services/file-processor.service';
import { Document } from './entities/document.entity';
import { FaqInteraction } from './entities/faq-interaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, FaqInteraction]),
    ConfigModule,
  ],
  controllers: [FaqController],
  providers: [FaqService, OpenAIService, FileProcessorService],
  exports: [FaqService],
})
export class FaqModule {} 