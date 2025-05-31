# Phase 1: Core Ticketing Foundations - Implementation Guide

## Overview

Phase 1 implements the core ticketing foundations with Firebase Authentication integration, database entities, and basic authentication endpoints. This phase establishes the foundation for the help desk portal.

## ✅ Completed Features

### 🔐 Firebase Authentication Integration
- **Primary authentication service** using Firebase Auth SDK
- User registration and login with Firebase tokens
- **Custom claims** for role-based access control
- Password reset functionality via Firebase
- Session management with Firebase Auth state
- Permission guards using Firebase custom claims

### 📊 Database Schema (TypeORM)
- **User Entity**: Complete user management with Firebase UID linking
- **Department Entity**: Hierarchical department structure
- **Priority Entity**: Ticket priority levels (Low, Medium, High, Critical)
- **Category Entity**: Ticket categorization within departments
- **Ticket Entity**: Core ticket management with status workflow
- **TicketComment Entity**: Comments and ticket history tracking
- **Attachment Entity**: File attachment metadata for Firebase Cloud Storage

### 🛡️ Authentication System
- **AuthService**: Complete Firebase integration with local database sync
- **AuthController**: RESTful endpoints for authentication
- **FirebaseAuthGuard**: Token validation and user injection
- **DTOs**: Validation for registration, login, and profile updates

### 🧪 Testing
- **Comprehensive unit tests** for AuthService (90%+ coverage)
- **Mock Firebase Admin SDK** for testing
- **Test coverage** for all authentication methods

## 🏗️ Architecture

### Database Configuration
```typescript
// TypeORM with PostgreSQL
- Host: localhost:5432
- Database: helpdesk_db
- Auto-sync: Development only
- Entities: Auto-loaded from entities directory
```

### Firebase Integration
```typescript
// Firebase Services Used:
- Authentication: User management and tokens
- Realtime Database: Ready for Phase 11 (Chat)
- Cloud Storage: Ready for file attachments
```

### API Endpoints

#### Authentication Endpoints
```
POST /auth/register     - Register new user
POST /auth/login        - Verify Firebase token
GET  /auth/me          - Get current user profile
PATCH /auth/profile    - Update user profile
PATCH /auth/users/:id/deactivate - Deactivate user (Admin)
PATCH /auth/users/:id/reactivate - Reactivate user (Admin)
POST /auth/sync/:firebaseUid - Sync user from Firebase (Admin)
GET  /auth/health      - Health check
```

## 🚀 Getting Started

### Prerequisites
1. **Node.js** 18+ installed
2. **PostgreSQL** 15+ running
3. **Firebase Project** created with Authentication enabled

### Environment Setup

1. **Copy environment file:**
```bash
cp env.example .env
```

2. **Configure environment variables:**
```env
# Database Configuration
DB_HOST="localhost"
DB_PORT=5432
DB_USERNAME="your_db_username"
DB_PASSWORD="your_db_password"
DB_NAME="helpdesk_db"
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Firebase Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"

# Application
NODE_ENV="development"
PORT=3001
```

### Installation & Running

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run start:dev
```

3. **Run tests:**
```bash
npm run test
npm run test:cov  # With coverage
```

## 📁 Project Structure

```
backend/src/
├── config/
│   ├── database.config.ts    # TypeORM configuration
│   └── firebase.config.ts    # Firebase Admin SDK setup
├── entities/
│   ├── user.entity.ts        # User entity with Firebase integration
│   ├── department.entity.ts  # Department hierarchy
│   ├── priority.entity.ts    # Ticket priorities
│   ├── category.entity.ts    # Ticket categories
│   ├── ticket.entity.ts      # Core ticket entity
│   ├── ticket-comment.entity.ts # Comments and history
│   └── attachment.entity.ts  # File attachment metadata
├── modules/
│   └── auth/
│       ├── auth.service.ts    # Authentication business logic
│       ├── auth.controller.ts # Authentication endpoints
│       ├── auth.module.ts     # Auth module configuration
│       ├── auth.service.spec.ts # Comprehensive tests
│       └── dto/               # Data Transfer Objects
├── common/
│   └── guards/
│       └── firebase-auth.guard.ts # Authentication guard
└── app.module.ts             # Main application module
```

## 🔧 Key Components

### User Roles & Permissions
```typescript
enum UserRole {
  END_USER = 'end_user',        // Create tickets, view own tickets
  AGENT = 'agent',              // Handle assigned tickets
  TEAM_LEAD = 'team_lead',      // Assign tickets, manage team
  MANAGER = 'manager',          // Team oversight, reporting
  ADMIN = 'admin',              // System management
  SUPER_ADMIN = 'super_admin'   // Full system access
}
```

### Firebase Integration Points
- **Authentication**: All user auth flows through Firebase
- **Custom Claims**: Role-based permissions stored in Firebase tokens
- **Token Validation**: Every protected endpoint validates Firebase tokens
- **User Sync**: Automatic sync between Firebase Auth and PostgreSQL

## 🧪 Testing Strategy

### Unit Tests
- **AuthService**: 100% method coverage
- **Mock Firebase**: Complete Firebase Admin SDK mocking
- **Error Handling**: All exception scenarios tested
- **Role Permissions**: Permission logic validation

### Test Commands
```bash
npm run test                    # Run all tests
npm run test:watch             # Watch mode
npm run test:cov               # Coverage report
npm run test auth.service      # Specific test file
```

## 🔒 Security Features

### Authentication Security
- **Firebase Token Validation**: All requests validated
- **Role-Based Access**: Custom claims for permissions
- **Account Management**: Deactivation/reactivation support
- **Input Validation**: DTOs with class-validator

### Database Security
- **UUID Primary Keys**: Non-sequential identifiers
- **Indexed Queries**: Optimized database access
- **Relationship Integrity**: Foreign key constraints
- **Audit Trail**: Created/updated timestamps

## 📈 Next Steps (Phase 2)

### Planned Features
1. **SLA Management**: Configurable SLAs per department/priority
2. **SLA Timers**: Real-time SLA tracking and breach alerts
3. **Working Hours**: Department-specific working hours
4. **Escalation Rules**: Automatic escalation on SLA breach

### Database Extensions
- SLA Rules table
- SLA Timers table
- Working Hours table
- Holidays table

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify Firebase credentials in environment
   - Check Firebase project configuration
   - Ensure service account has proper permissions

2. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database exists

3. **TypeORM Sync Issues**
   - Set `DB_SYNCHRONIZE=true` for development
   - Check entity imports in app.module.ts
   - Verify database schema permissions

### Debug Commands
```bash
# Check database connection
npm run start:dev --verbose

# View TypeORM logs
# Set DB_LOGGING=true in .env

# Test Firebase connection
# Check logs for Firebase initialization
```

## 📚 Documentation

### API Documentation
- All endpoints documented with JSDoc
- Request/response examples in controller comments
- Error handling documented

### Code Documentation
- **Entities**: Comprehensive field documentation
- **Services**: Method documentation with parameters
- **DTOs**: Validation rules documented
- **Guards**: Security implementation explained

---

**Phase 1 Status**: ✅ **COMPLETE**
**Next Phase**: Phase 2 - SLA & Workflow Enhancements
**Estimated Completion**: Ready for Phase 2 implementation 