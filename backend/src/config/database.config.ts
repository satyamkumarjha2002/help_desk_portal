import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Database configuration for TypeORM
 * 
 * This configuration supports PostgreSQL as the primary database
 * and handles different environments (development, staging, production)
 * 
 * @param configService - NestJS ConfigService for environment variables
 * @returns TypeORM configuration object
 */
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE') && !isProduction,
    logging: configService.get<boolean>('DB_LOGGING') && !isProduction,
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 3000,
    maxQueryExecutionTime: 10000, // Log queries taking longer than 10 seconds
  };
}; 