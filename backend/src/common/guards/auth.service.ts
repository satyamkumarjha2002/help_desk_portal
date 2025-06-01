import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

/**
 * Auth Guard Service
 * 
 * Provides user lookup functionality for the Firebase Auth Guard.
 * This service encapsulates the database access, making the guard
 * independent of the UserRepository.
 */
@Injectable()
export class AuthGuardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Find user by Firebase UID
   */
  async findUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { firebaseUid },
      relations: ['department'],
    });
  }
} 