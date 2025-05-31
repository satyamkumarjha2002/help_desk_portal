import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { FirebaseConfig } from './config/firebase.config';
import { AuthModule } from './modules/auth/auth.module';

// Import entities
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { Priority } from './entities/priority.entity';
import { Category } from './entities/category.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { Attachment } from './entities/attachment.entity';

/**
 * Main Application Module
 * 
 * Configures the core application with:
 * - Environment configuration
 * - Database connection (PostgreSQL with TypeORM)
 * - Firebase integration
 * - Core entities
 * - Feature modules (Auth, Users, Tickets)
 */
@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    // Register entities
    TypeOrmModule.forFeature([
      User,
      Department,
      Priority,
      Category,
      Ticket,
      TicketComment,
      Attachment,
    ]),

    // Feature modules
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'FIREBASE_APP',
      useFactory: (configService: ConfigService) => {
        return FirebaseConfig.initialize(configService);
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
