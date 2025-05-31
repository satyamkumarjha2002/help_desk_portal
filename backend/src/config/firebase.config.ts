import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK configuration
 * 
 * Provides configuration for Firebase Authentication, Realtime Database,
 * and Cloud Storage integration for the help desk portal
 */
export class FirebaseConfig {
  private static instance: admin.app.App;

  /**
   * Initialize Firebase Admin SDK
   * @param configService - NestJS ConfigService for environment variables
   * @returns Firebase Admin App instance
   */
  static initialize(configService: ConfigService): admin.app.App {
    if (this.instance) {
      return this.instance;
    }

    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    
    if (!privateKey || !configService.get('FIREBASE_PROJECT_ID')) {
      throw new Error('Firebase configuration is missing. Please check your environment variables.');
    }

    this.instance = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
        privateKey,
        clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      }),
      databaseURL: configService.get<string>('FIREBASE_DATABASE_URL'),
      storageBucket: configService.get<string>('FIREBASE_STORAGE_BUCKET'),
    });

    return this.instance;
  }

  /**
   * Get Firebase Admin App instance
   * @returns Firebase Admin App instance
   */
  static getInstance(): admin.app.App {
    if (!this.instance) {
      throw new Error('Firebase has not been initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * Get Firebase Auth service
   * @returns Firebase Auth service
   */
  static getAuth(): admin.auth.Auth {
    return this.getInstance().auth();
  }

  /**
   * Get Firebase Realtime Database service
   * @returns Firebase Realtime Database service
   */
  static getDatabase(): admin.database.Database {
    return this.getInstance().database();
  }

  /**
   * Get Firebase Cloud Storage service
   * @returns Firebase Cloud Storage service
   */
  static getStorage(): admin.storage.Storage {
    return this.getInstance().storage();
  }
} 