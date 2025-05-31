import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { User } from '../../entities/user.entity';

/**
 * Authentication Module
 * 
 * Provides authentication services and controllers
 * Integrates with Firebase Authentication and local database
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseAuthGuard,
  ],
  exports: [
    AuthService,
    FirebaseAuthGuard,
  ],
})
export class AuthModule {} 