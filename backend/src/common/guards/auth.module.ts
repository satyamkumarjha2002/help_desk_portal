import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthGuardService } from './auth.service';
import { User } from '../../entities/user.entity';

/**
 * Global Auth Module
 * 
 * Provides authentication guards and related dependencies globally
 * so they can be used across all modules without explicit imports.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AuthGuardService, FirebaseAuthGuard],
  exports: [AuthGuardService, FirebaseAuthGuard],
})
export class AuthModule {} 