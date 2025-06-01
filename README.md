# Help Desk Portal - Comprehensive Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Firebase Services Integration](#firebase-services-integration)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Database Schema Design](#database-schema-design)
6. [Development Phases](#development-phases)
7. [API Specification](#api-specification)
9. [Environment Configuration](#environment-configuration)
10. [Development Workflow](#development-workflow)

---

## Project Overview

A comprehensive AI-powered help desk portal with multi-phase development, featuring ticketing system, SLA management, knowledge base, analytics, and real-time chat capabilities.

**Core Firebase Integration:**
- **Authentication**: Firebase Authentication for user management
- **Messaging**: Firebase Realtime Database for real-time chat and notifications
- **File Storage**: Firebase Cloud Storage for all file attachments

---

## Technical Architecture

### System Components
- **Frontend**: Next.js 14+ with App Router, ShadCN UI, Tailwind CSS
- **Backend**: Nest.js with TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: Firebase Authentication (Primary Auth Service)
- **Real-time Messaging**: Firebase Realtime Database (Chat & Notifications)
- **File Storage**: Firebase Cloud Storage (All File Uploads)
- **Email**: SendGrid/Amazon SES
- **Queue**: Bull/BullMQ (for background jobs)
- **AI/ML**: OpenAI GPT, Hugging Face models

### Security Requirements
- HTTPS everywhere
- JWT token management with Firebase Authentication
- Input validation & sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF protection
- Rate limiting (10 req/sec per user)
- File upload validation & virus scanning via Firebase Cloud Storage

### Data Distribution Strategy
```typescript
// Firebase Authentication
- User authentication & session management
- Role-based access tokens
- Social login integration (Google, Microsoft)
- Password reset and account management

// Firebase Realtime Database (Messaging & Real-time)
- Real-time chat messages between users
- Live notifications and alerts
- Online user presence tracking
- Typing indicators for chat
- Real-time dashboard updates

// Firebase Cloud Storage (File Management)
- Ticket attachment uploads
- Knowledge base article images
- User profile photos
- Chat file sharing
- Document storage with download URLs

// PostgreSQL (Business Logic & Analytics)
- Tickets & ticket history
- SLA rules & calculations
- Knowledge base articles content
- Analytics & reporting data
- User roles & permissions
- AI training data & models
- Audit logs
```

---

## Firebase Services Integration

### 🔐 Firebase Authentication
**Primary authentication service for the entire application**

```typescript
// Authentication Features
- User registration and login
- Email/password authentication
- User can uplaod their profile PIC while account creation they can change it later also.
- Social login (Google, Microsoft)
- Password reset functionality
- Custom claims for role-based access
- JWT token management
- Session persistence
- Multi-factor authentication support

// Integration Points
- All API endpoints require Firebase Auth tokens
- User roles stored as custom claims
- Frontend protected routes use Firebase Auth state
- Backend validates Firebase tokens for authorization
```

### 💬 Firebase Realtime Database
**Primary messaging and real-time communication service**

```typescript
// Messaging Features
- Real-time chat between users (Phase 11)
- Agent-to-customer chat support
- Internal team communication
- Typing indicators and read receipts
- Message history and search
- File sharing in chat conversations
- Group chat capabilities

// Real-time Updates
- Live ticket status updates
- SLA breach notifications
- Dashboard real-time metrics
- Online user presence
- Live notification delivery
- Real-time collaboration features

// Data Structure
/chats
  /{chatId}
    /messages
      /{messageId}: { text, timestamp, userId, attachments }
    /participants: { userId1: true, userId2: true }
    /typing: { userId: timestamp }

/notifications
  /{userId}
    /{notificationId}: { type, title, message, timestamp, read }

/presence
  /{userId}: { online: true, lastSeen: timestamp }
```

### 📁 Firebase Cloud Storage
**Primary file storage service for all uploads**

```typescript
// File Storage Features
- Ticket attachment uploads (images, documents, etc.)
- Knowledge base article media
- User profile photo uploads
- Chat file sharing and media
- Bulk file operations
- Secure file access with signed URLs
- Automatic file compression and optimization

// Storage Structure
/tickets
  /{ticketId}
    /attachments
      /{attachmentId}.{extension}

/kb-articles
  /{articleId}
    /images
      /{imageId}.{extension}

/chat-files
  /{chatId}
    /{messageId}
      /{fileName}.{extension}

/user-profiles
  /{userId}
    /avatar.{extension}

// Security Rules
- Users can only upload to their own folders
- File size limits and type restrictions
- Virus scanning integration
- Automatic cleanup of orphaned files
```

---

## User Roles & Permissions

### Role Hierarchy
```yaml
Super Admin:
  - Full system access
  - User management
  - System configuration
  - All analytics

Admin:
  - Department management
  - SLA configuration
  - Knowledge base management
  - User role assignment

Manager:
  - Team oversight
  - Reporting & analytics
  - SLA monitoring
  - Knowledge base approval

Team Lead:
  - Ticket assignment
  - Team member tickets
  - Basic reporting
  - Escalation handling

Agent:
  - Assigned ticket management
  - Knowledge base access
  - Basic ticket creation
  - Chat support

End User:
  - Ticket creation
  - Own ticket viewing
  - Knowledge base search
  - Chat with support
```

### Permission Matrix
```yaml
Tickets:
  Create: [End User, Agent, Team Lead, Manager, Admin, Super Admin]
  View Own: [End User, Agent, Team Lead, Manager, Admin, Super Admin]
  View All: [Team Lead, Manager, Admin, Super Admin]
  Edit: [Agent (assigned), Team Lead, Manager, Admin, Super Admin]
  Delete: [Manager, Admin, Super Admin]
  Assign: [Team Lead, Manager, Admin, Super Admin]

Analytics:
  Basic Reports: [Team Lead, Manager, Admin, Super Admin]
  Advanced Analytics: [Manager, Admin, Super Admin]
  Custom Reports: [Manager, Admin, Super Admin]

Configuration:
  SLA Rules: [Admin, Super Admin]
  User Management: [Admin, Super Admin]
  System Settings: [Super Admin]
```

---

## Database Schema Design

### Core Tables

```sql
-- Users with Firebase integration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'end_user',
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments with hierarchy
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES departments(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket priorities and categories
CREATE TABLE priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL, -- 1=Low, 2=Medium, 3=High, 4=Critical
  color VARCHAR(7) NOT NULL -- Hex color code
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Main tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL, -- HD-2024-001234
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority_id UUID REFERENCES priorities(id),
  category_id UUID REFERENCES categories(id),
  department_id UUID REFERENCES departments(id),
  requester_id UUID REFERENCES users(id) NOT NULL,
  assignee_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id) NOT NULL,
  tags TEXT[], -- Array of tags
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  due_date TIMESTAMP
);

-- Ticket comments and history
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes vs public comments
  comment_type comment_type DEFAULT 'comment', -- comment, status_change, assignment
  metadata JSONB DEFAULT '{}', -- For status changes, assignments, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  firebase_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Rules
CREATE TABLE sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  priority_id UUID REFERENCES priorities(id),
  category_id UUID REFERENCES categories(id),
  response_time_hours INTEGER NOT NULL, -- First response SLA
  resolution_time_hours INTEGER NOT NULL, -- Resolution SLA
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Tracking
CREATE TABLE sla_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sla_rule_id UUID REFERENCES sla_rules(id),
  first_response_due TIMESTAMP,
  first_response_at TIMESTAMP,
  resolution_due TIMESTAMP,
  resolution_at TIMESTAMP,
  is_breached BOOLEAN DEFAULT false,
  breach_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id UUID REFERENCES categories(id),
  author_id UUID REFERENCES users(id),
  status article_status DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Working Hours Configuration
CREATE TABLE working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working_day BOOLEAN DEFAULT true
);

-- Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  department_id UUID REFERENCES departments(id), -- NULL = global holiday
  is_recurring BOOLEAN DEFAULT false
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional data (ticket_id, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- ticket, user, sla_rule, etc.
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enums
```sql
CREATE TYPE user_role AS ENUM ('end_user', 'agent', 'team_lead', 'manager', 'admin', 'super_admin');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled');
CREATE TYPE comment_type AS ENUM ('comment', 'status_change', 'assignment', 'escalation', 'merge', 'split');
CREATE TYPE article_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE notification_type AS ENUM ('ticket_assigned', 'ticket_updated', 'sla_warning', 'sla_breach', 'mention', 'chat_message');
```

---

## Development Phases

### Phase 0: Project creation(status - done)
  # Create the root project folder and initialize a single Git repository
  mkdir my-fullstack-app && cd my-fullstack-app
  git init

  # Create a NestJS project in the "backend" folder (no extra Git repo inside)
  npx @nestjs/cli new backend --directory backend --skip-git

  # Move into backend and install TypeORM with a database driver (SQLite for simplicity)
  cd backend
  npm install @nestjs/typeorm typeorm sqlite3
  cd ..

  # Create a Next.js project in the "frontend" folder (no extra Git repo inside)
  npx create-next-app@latest frontend --typescript --eslint --no-git

  # Move into frontend and install ShadCN
  cd frontend
  npx shadcn-ui@latest init
  # Answer prompts as needed to configure ShadCN (choose Tailwind, App Router, etc.)
  cd ..

  # Create a single .gitignore file at the root (covers both frontend and backend)
  cat <<EOL > .gitignore
  # Node modules
  **/node_modules

  # Build outputs
  **/.next
  **/dist

  # Logs
  **/logs
  **/*.log

  # OS-specific
  .DS_Store

  # Env files
  **/.env
  **/.env.local
  EOL

  # Add all files to the root Git repository and make the initial commit
  git add .
  git commit -m "Initial commit: NestJS backend + Next.js frontend (ShadCN), single git repo"


### Phase 1: Core Ticketing Foundations(status - pending)

* **Auth Part - Firebase Authentication Integration**
  - **Firebase Authentication** as primary auth service
  - User registration/login using Firebase Auth SDK
  - **Firebase Custom Claims** for role-based access control
  - Social login integration (Google, Microsoft) via Firebase
  - **Firebase Auth tokens** for API authentication
  - Password reset via Firebase Auth
  - Session management with Firebase Auth state
  - Permission guards using Firebase custom claims

* **Ticket Submission - Firebase Storage Integration**
  - Web form + email ingestion
  - Capture: requester, department, priority, subject, description, attachments
  - Ticket numbering scheme (HD-YYYY-NNNNNN)
  - **File upload via Firebase Cloud Storage**
  - **Firebase Storage security rules** for access control
  - **Attachment metadata stored** in PostgreSQL with Firebase paths
  - Email parsing and duplicate detection
  - **Firebase Storage download URLs** for file access

* **Basic Ticket CRUD**
  - Create, view, update, close
  - Status workflow with validation rules
  - Priority and category management
  - Custom fields support (JSONB)
  - Audit trail for all changes
  - **File attachments stored in Firebase Cloud Storage**

* **Manual Triage & Assignment**
  - Team‑lead reassign
  - Bulk assignment operations
  - Assignment rules and validation
  - **Real-time notifications via Firebase Realtime Database**

* **Dashboard (Agent View) - Firebase Real-time Integration**
  - My tickets, unassigned queue, SLA breach alerts
  - Quick actions (status change, priority update)
  - **Real-time updates via Firebase Realtime Database**
  - **Live notifications using Firebase listeners**
  - **Online user presence** via Firebase Realtime Database

---

### Phase 2: SLA & Workflow Enhancements(status - pending)

* **Configurable SLAs**
  - Per department/category/priority
  - Response time and resolution time tracking
  - Working hours configuration per department
  - Holiday calendar management

* **SLA Timers & Escalations**
  - Auto‑alert/escalate on breach
  - Real-time SLA timer calculations
  - Breach notifications via email and in-app
  - Manager override capabilities

* **Working‑hours Awareness**
  - Exclude weekends/off‑hours
  - Timezone handling for global teams
  - Department-specific working hours

---

### Phase 3: Knowledge Base & Self‑Help(status - pending)

* **KB/FAQ Module**
  - Article CRUD, linkable in tickets
  - Article versioning and approval workflows
  - Category and tag management
  - Search functionality with full-text search
  - Rating & feedback (5-star + comments)
  - View analytics and popular articles

* **Basic Self‑Serve Bot**
  - Keyword search of FAQs with relevance scoring
  - Simple chat widget fallback to human
  - Article suggestions based on ticket content
  - Chat history and session management

---

### Phase 4: Managerial Insights(status - pending)

* **Manager Dashboard**
  - Team workload
  - Average response & resolution times
  - Backlog trends
  - SLA compliance rates
  - Agent performance metrics

* **Custom Reports**
  - Filter by date, department, category, priority
  - Export formats (PDF, Excel, CSV)
  - Scheduled report delivery via email
  - Custom KPIs and metrics definition

---

### Phase 5: Multi‑Channel Ingestion & Ticket Ops(status - pending)

* **Chat‑to‑Ticket** integration (Teams/Slack)
  - Message threading and context preservation
  - Automatic ticket creation from chat

* **API‑Based Submission** for 3rd‑party tools
  - RESTful API with authentication
  - Webhook configurations
  - Rate limiting and error handling

* **Ticket Merge & Split** workflows
  - Conflict resolution for merges
  - Context preservation for splits

---

### Phase 6: Auto‑Routing & Tagging(status - pending)

* **Auto‑Routing Engine**
  - Text classification (BERT/fastText) for department → agent
  - Confidence thresholds → human triage queue
  - Learning from manual assignments

* **Auto‑Tagging Engine**
  - Predict categories/tags on creation
  - Multi-label classification
  - Supports search/filtering & downstream analytics

---

### Phase 7: AI‑Assisted Responses(status - pending)

* **Response Suggestion**
  - Retrieval from KB + past tickets
  - LLM‑based draft with "support tone"
  - In‑UI accept/tweak/reject + source highlights
  - Template management and customization

* **Sentiment Analysis**
  - Detect frustration/urgency, auto‑prioritize/escalate
  - Customer satisfaction prediction
  - Real-time sentiment monitoring

---

### Phase 8: Advanced Self‑Serve & Summarization(status - pending)

* **Hybrid Retrieval Answer Bot**
  - Vector search + keyword fallback
  - Extractive answers; generative summary with citations
  - Conversation history & human escalation
  - Multi-turn conversation handling

* **AI Ticket Summarizer**
  - Thread → bullet points or "what's next"
  - Extract action items
  - Resolution summary generation

---

### Phase 9: Pattern Detection & Analytics(status - pending)

* **Batch Analysis** (daily/weekly)
  - Cluster similar ticket texts, flag spikes
  - Anomaly detection in ticket patterns
  - Root cause analysis suggestions

* **Trend Dashboards**
  - Time‑series charts of top categories
  - Alerting for sudden surges
  - Predictive analytics for workload planning

* **Root‑Cause Mining UI**
  - Drill‑down on flagged clusters
  - Interactive analytics interface

---

### Phase 10: Extensibility, Compliance & Monitoring(status - pending)

* **Plugin Architecture** for future AI features
  - Extensible framework
  - Third-party integration support

* **Authentication & Permissions**
  - SAML/SSO + role‑based access
  - Multi-factor authentication
  - Advanced role management

* **Data Privacy & Compliance**
  - Encryption at rest, audit logs
  - GDPR compliance features
  - Data retention policies

* **Monitoring & Logging**
  - Track AI suggestion usage & accuracy
  - Query‑validation on startup to catch schema drift
  - Performance monitoring

### Phase 11: Chat Interface - Firebase Realtime Database Integration(status - pending)
  - **Firebase Realtime Database** as primary messaging service
  - **Real-time chat** between users using Firebase listeners
  - **Firebase Realtime Database structure** for chat messages
  - **Real-time typing indicators** via Firebase
  - **Online presence tracking** using Firebase Realtime Database
  - **Message history and synchronization** across devices
  - **File sharing in chat** using Firebase Cloud Storage
  - **Push notifications** for new messages via Firebase
  - **Group chat capabilities** with Firebase Realtime Database
  - **Message read receipts** and delivery status
  - **Chat moderation** and content filtering
  - **Emoji support** and rich text messaging

---

## API Specification

### Authentication Endpoints
```typescript
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/register
GET  /auth/me
PATCH /auth/profile
```

### Ticket Management
```typescript
GET    /tickets              // List with filtering, pagination
POST   /tickets              // Create new ticket
GET    /tickets/:id          // Get specific ticket
PATCH  /tickets/:id          // Update ticket
DELETE /tickets/:id          // Delete ticket (soft delete)
POST   /tickets/:id/assign   // Assign ticket
POST   /tickets/:id/comments // Add comment
GET    /tickets/:id/history  // Get audit trail
POST   /tickets/:id/merge    // Merge tickets
POST   /tickets/:id/split    // Split ticket
```

### Knowledge Base
```typescript
GET    /kb/articles                 // List articles
POST   /kb/articles                 // Create article
GET    /kb/articles/:id             // Get article
PATCH  /kb/articles/:id             // Update article
DELETE /kb/articles/:id             // Delete article
POST   /kb/articles/:id/rate        // Rate article
GET    /kb/search                   // Search articles
```

### Real-time Events (WebSocket)
```typescript
// Ticket events
ticket.created
ticket.updated
ticket.assigned
ticket.status_changed

// SLA events
sla.warning
sla.breach

// Chat events
chat.message
chat.typing
chat.user_online

// Notification events
notification.new
notification.read
```
---

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_API_KEY=your-api-key
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Email
SMPT Cleint - MailJet
MailJetAPIKEY=MJ.xxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourcompany.com

# AI Services
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

---

## Development Workflow

### Branch Strategy
- **main**: Production branch
- **develop**: Staging branch
- **feature/***: Feature development
- **hotfix/***: Emergency fixes

### Code Quality
- ESLint + Prettier
- Husky pre-commit hooks
- TypeScript strict mode
- 90% test coverage requirement

### CI/CD Pipeline
- GitHub Actions
- Automated testing
- Security scanning
- Deployment automation

---

## Current Configuration

### Tech Stack
- **Frontend**: Next.js, ShadCN, Tailwind
- **Backend**: Nest.js, PostgreSQL DB
- **Auth/Messaging**: Firebase Authentication, Realtime database for messaging

### Firebase Credentials (Replace with your own)
```json
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "project_id": "your-firebase-project-id",
    "storage_bucket": "your-firebase-project-id.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "YOUR_MOBILE_SDK_APP_ID",
        "android_client_info": {
          "package_name": "com.yourcompany.yourapp"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "your-firebase-api-key"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

### PostgreSQL Database (Replace with your own)
```
DB URL: postgres://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:YOUR_DB_PORT/YOUR_DB_NAME?sslmode=require
```

---

## Project Development Rules

### Code Organization
- **Divide code into small, reusable components**
- **Write proper documentation for all modules**
- **Follow consistent naming conventions**
- **Implement proper error handling**

### Data Architecture
```typescript
// Firebase Realtime Database
- User authentication & profiles
- Real-time chat messages
- Live notifications
- File metadata (with Cloud Storage URLs)

// PostgreSQL
- Tickets & ticket history
- SLA rules & calculations
- Knowledge base articles
- Analytics & reporting data
- User roles & permissions
- AI training data & models
```

### Example Implementation
```typescript
// Backend service layer
class TicketService {
  async createTicket(data) {
    // 1. Save to PostgreSQL
    const ticket = await this.postgresRepo.create(data);
    
    // 2. Send real-time notification via Firebase
    await this.firebaseService.notify(ticket.assigneeId, {
      type: 'new_ticket',
      ticketId: ticket.id
    });
    
    return ticket;
  }
}
```

---

## 🔥 Firebase Integration Summary

### Core Firebase Services Used Throughout the Application:

#### 1. 🔐 **Firebase Authentication**
- **Primary authentication service** for all user management
- Used in: User login/registration, API authorization, role-based access
- Integration: Frontend auth state, backend token validation, custom claims

#### 2. 💬 **Firebase Realtime Database**  
- **Primary messaging and real-time communication service**
- Used in: Chat interface, live notifications, real-time updates, presence tracking
- Integration: WebSocket-like real-time listeners, live dashboard updates

#### 3. 📁 **Firebase Cloud Storage**
- **Primary file storage service** for all uploads and attachments
- Used in: Ticket attachments, chat files, user profiles, knowledge base media
- Integration: Secure file uploads, download URLs, access control

### Key Integration Points:
- **All user authentication** flows through Firebase Auth
- **All real-time features** use Firebase Realtime Database
- **All file operations** use Firebase Cloud Storage
- **PostgreSQL** handles business logic, analytics, and structured data
- **Hybrid architecture** leverages the best of both Firebase and PostgreSQL

---

## Recent Updates

### Notification System Enhancement
- **Fixed Push Notification Issue**: Resolved issue where push notifications were triggered on page load
- **Smart Notification Tracking**: Implemented proper tracking to distinguish between existing notifications (loaded on page refresh) and truly new real-time notifications
- **Improved User Experience**: Push notifications and toast messages now only appear for actual new notifications, not when browsing or refreshing pages
- **Enhanced Real-time Logic**: Added timestamp-based filtering and notification ID tracking to prevent duplicate notifications

The notification system now properly handles:
- Initial page load without showing existing notifications as "new"
- Real-time notifications only for actual user actions
- Proper cleanup and state management across page refreshes
- Browser notification permission handling

---

*This documentation serves as the complete reference for the Help Desk Portal project development.*