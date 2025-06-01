import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';

/**
 * Authentication Module
 * 
 * Provides authentication services and controllers
 * Integrates with Firebase Authentication and local database
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
  ],
  exports: [
    AuthService,
  ],
})
export class AuthModule {} 