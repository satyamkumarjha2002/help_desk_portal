# 🎫 Help Desk Portal

A modern, AI-powered help desk management system built with **Next.js** frontend and **NestJS** backend. This system intelligently reduces ticket volume by suggesting FAQ solutions before ticket creation and automatically converts resolved tickets into knowledge base articles.

## 🚀 What This Application Does

The Help Desk Portal is a comprehensive support ticket management system that leverages AI to:

- **Intelligently Route Support Requests**: Automatically suggests FAQ solutions before allowing ticket creation
- **Manage Support Tickets**: Complete CRUD operations with automated classification and assignment
- **Maintain Knowledge Base**: AI-powered FAQ system with automatic content generation
- **Provide Self-Service Options**: Interactive FAQ chatbot for instant problem resolution
- **Track Performance**: Analytics and reporting for ticket trends and FAQ effectiveness

### Key Features

- 🤖 **AI-Powered FAQ Suggestions**: Analyzes ticket content and suggests relevant FAQ articles
- 📋 **Smart Ticket Classification**: Automatically categorizes tickets by department, priority, and type
- 🔄 **Self-Improving Knowledge Base**: Converts resolved tickets into FAQ documents automatically
- 👥 **Role-Based Access Control**: Different permissions for users, agents, managers, and admins
- 📊 **Comprehensive Analytics**: Track ticket trends, FAQ effectiveness, and team performance
- 🔔 **Real-Time Notifications**: Firebase-based notifications for ticket updates
- 📎 **File Attachments**: Support for documents, images, and other file types
- 🌙 **Dark/Light Theme**: Modern UI with theme switching capability

## 🔄 Application Flow

### 1. **Smart Ticket Creation Flow**
```
User starts creating ticket
    ↓
AI analyzes ticket content
    ↓
[AI Decision: Can FAQ resolve this?]
    ↓                    ↓
FAQ Suggested         Direct Ticket Creation
    ↓                    ↓
User tries FAQ      Ticket gets auto-classified
    ↓                    ↓
Problem Resolved    Ticket assigned to agent
                         ↓
                    Agent resolves ticket
                         ↓
                    AI converts to FAQ (if suitable)
```

### 2. **User Journey by Role**

#### **End Users**
1. Submit support requests or browse FAQ
2. Get AI-suggested FAQ solutions before ticket creation
3. Receive notifications about ticket updates
4. Provide feedback on FAQ responses

#### **Agents**
1. Receive auto-assigned tickets based on department
2. Access AI-generated ticket classifications
3. Resolve tickets with full comment history
4. Benefit from reduced workload through FAQ deflection

#### **Managers/Admins**
1. Monitor team performance and ticket trends
2. Manage knowledge base and FAQ documents
3. View analytics on FAQ effectiveness
4. Oversee automatic FAQ generation from resolved tickets

## 🤖 AI Features Deep Dive

### 1. **FAQ Suggestion Engine**

**How it works:**
- When users create tickets, AI analyzes the title and description
- Compares against existing knowledge base using semantic similarity
- Evaluates if the issue can be resolved through self-service
- Shows confidence-scored suggestions with relevant articles

**Technical Implementation:**
- Uses OpenAI GPT-3.5-turbo for natural language understanding
- Analyzes top 20 most relevant documents for context
- Applies confidence thresholds (60%+ for suggestions)
- Generates natural language questions for FAQ redirection

**Code Location:** `backend/src/modules/faq/services/openai.service.ts` - `analyzeTicketForFaqRedirection()`

### 2. **Automatic Ticket Classification**

**How it works:**
- AI analyzes ticket content to determine appropriate department, category, and priority
- Uses existing system categories and departments for classification
- Provides confidence scores for each classification decision
- Falls back gracefully when AI service is unavailable

**Technical Implementation:**
- Structured prompting with available options context
- JSON response parsing with validation
- Confidence scoring for each classification field
- Integration with existing ticket creation workflow

**Code Location:** `backend/src/modules/faq/services/openai.service.ts` - `classifyTicketFields()`

### 3. **Smart Ticket-to-FAQ Conversion**

**How it works:**
- When tickets are resolved, AI analyzes if they represent common issues
- Evaluates suitability based on reusability and generalizability
- Generates structured FAQ documents with proper formatting
- Automatically tags and categorizes new FAQ content

**Technical Implementation:**
- Triggered automatically on ticket status change to "RESOLVED"
- Analyzes complete ticket conversation including comments
- Applies quality thresholds (70%+ suitability score)
- Creates searchable FAQ documents with audit trails

**Code Location:** `backend/src/modules/faq/services/openai.service.ts` - `analyzeTicketForFaq()`

### 4. **AI Fallback Mechanisms**

- **Service Unavailability**: Graceful degradation with heuristic-based suggestions
- **Rate Limiting**: Queue management and retry logic
- **Error Handling**: Comprehensive logging and user-friendly error messages
- **Performance**: Caching and optimized API calls

## 🛠️ Technology Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Authentication**: Firebase Auth
- **File Storage**: Firebase sotrage
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **UI Components**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Custom Hooks
- **Authentication**: Firebase Auth SDK
- **HTTP Client**: Axios with interceptors
- **Form Handling**: React Hook Form with validation

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Firebase Project (for authentication)
- OpenAI API Key (for AI features)

### 1. **Clone the Repository**
```bash
git clone <repository-url>
cd help_desk_portal
```

### 2. **Backend Setup**

```bash
cd backend
npm install
```

**Environment Configuration:**
Create `.env` file in the backend directory:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=help_desk_portal
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Application
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
```

**Database Setup:**
```bash
# Run database migrations
npm run migration:run

# Seed initial data (optional)
npm run seed
```

**Start Backend:**
```bash
npm run start:dev
```
Backend will run on `http://localhost:3001`

### 3. **Frontend Setup**

```bash
cd frontend
npm install
```

**Environment Configuration:**
Create `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

**Start Frontend:**
```bash
npm run dev
```
Frontend will run on `http://localhost:3000`

### 4. **Firebase Setup**

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Generate a service account key for backend
4. Get web app configuration for frontend
5. Configure authentication settings

### 5. **OpenAI Setup**

1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Add to backend environment variables
3. AI features will work with GPT-3.5-turbo model
4. Optional: Configure usage limits and monitoring

## 🎯 Key Features Usage

### **For End Users:**
1. **Smart Ticket Creation**: Visit `/tickets/new` - AI will suggest FAQ solutions if applicable
2. **FAQ Chat**: Visit `/faq` - Ask questions and get instant AI responses
3. **Ticket Tracking**: Visit `/tickets` - Track your submitted tickets

### **For Agents:**
1. **Ticket Management**: Access assigned tickets with AI classifications
2. **Knowledge Base**: Contribute to FAQ by resolving tickets effectively
3. **Performance Tracking**: Monitor resolution times and customer satisfaction

### **For Admins:**
1. **Analytics Dashboard**: View ticket trends and FAQ effectiveness
2. **User Management**: Manage roles and permissions
3. **Knowledge Base Management**: Oversee automatic FAQ generation
4. **System Configuration**: Configure departments, categories, and priorities

## 📊 Analytics & Monitoring

- **Ticket Metrics**: Volume, resolution times, satisfaction scores
- **FAQ Effectiveness**: Usage statistics, deflection rates, user feedback
- **AI Performance**: Classification accuracy, suggestion success rates
- **User Behavior**: Most common issues, knowledge gaps

## 🔒 Security Features

- **Authentication**: Firebase-based secure authentication
- **Authorization**: Role-based access control with route protection
- **Data Validation**: Comprehensive input validation and sanitization
- **File Security**: Upload validation and type checking
- **API Security**: Request rate limiting and CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing code style
4. Test your changes thoroughly
5. Submit a pull request with detailed description

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section in the documentation
2. Review the application logs for error details
3. Create an issue in the repository with steps to reproduce
4. Contact the development team for assistance

---
