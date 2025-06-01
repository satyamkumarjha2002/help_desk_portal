import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { FirebaseConfig } from './config/firebase.config';
import { AuthModule as GuardAuthModule } from './common/guards/auth.module';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PrioritiesModule } from './modules/priorities/priorities.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { CommentsModule } from './modules/comments/comments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';

// Import entities
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { Priority } from './entities/priority.entity';
import { Category } from './entities/category.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { Attachment } from './entities/attachment.entity';
import { Notification } from './entities/notification.entity';

/**
 * Main Application Module
 * 
 * Configures the core application with:
 * - Environment configuration
 * - Database connection (PostgreSQL with TypeORM)
 * - Firebase integration
 * - Core entities
 * - Feature modules (Auth, Tickets, Priorities, Departments, Categories, Attachments, Comments, Notifications)
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

    // Register entities globally
    TypeOrmModule.forFeature([
      User,
      Department,
      Priority,
      Category,
      Ticket,
      TicketComment,
      Attachment,
      Notification,
    ]),

    // Global auth module for guards
    GuardAuthModule,

    // Feature modules
    AuthModule,
    TicketsModule,
    PrioritiesModule,
    DepartmentsModule,
    CategoriesModule,
    AttachmentsModule,
    CommentsModule,
    NotificationsModule,
    AdminModule,
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
