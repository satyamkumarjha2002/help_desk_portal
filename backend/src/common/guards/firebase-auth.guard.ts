import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseConfig } from '../../config/firebase.config';
import { AuthGuardService } from './auth.service';

/**
 * Firebase Authentication Guard
 * 
 * Validates Firebase ID tokens and injects user data into request
 * Protects routes that require authentication
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly authGuardService: AuthGuardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization header found');
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify Firebase token
      const firebaseAuth = FirebaseConfig.getAuth();
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);

      // Get user from database
      const user = await this.authGuardService.findUserByFirebaseUid(decodedToken.uid);

      if (!user) {
        throw new UnauthorizedException('User not found in database');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      // Inject user into request
      request.user = user;
      request.firebaseToken = decodedToken;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
} 