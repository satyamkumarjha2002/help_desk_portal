// User types
export enum UserRole {
  END_USER = 'end_user',
  AGENT = 'agent',
  TEAM_LEAD = 'team_lead',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  preferences: Record<string, any>;
  departmentId?: string;
  department?: Department;
  profilePictureUrl?: string;
  profilePicturePath?: string;
  createdAt: string;
  updatedAt: string;
}

// Department types
export interface Department {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  parent?: Department;
  children?: Department[];
}

// Priority types
export interface Priority {
  id: string;
  name: string;
  level: number;
  color: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  departmentId?: string;
  description?: string;
  isActive: boolean;
  department?: Department;
}

// Ticket types
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  tags: string[];
  customFields: Record<string, any>;
  dueDate?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  priority?: Priority;
  category?: Category;
  department?: Department;
  requester: User;
  assignee?: User;
  createdBy: User;
  comments?: TicketComment[];
  attachments?: Attachment[];
}

// Comment types
export enum CommentType {
  COMMENT = 'comment',
  STATUS_CHANGE = 'status_change',
  ASSIGNMENT = 'assignment',
  ESCALATION = 'escalation',
  REPLY = 'reply'
}

export interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  commentType: CommentType;
  metadata: Record<string, any>;
  createdAt: string;
  ticketId: string;
  userId: string;
  user: User;
  attachments?: Attachment[];
  
  // Reply functionality
  parentCommentId?: string;
  parentComment?: TicketComment;
  replies?: TicketComment[];
}

// Attachment types
export interface Attachment {
  id: string;
  originalFilename: string;
  firebasePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  ticketId?: string;
  commentId?: string;
  uploadedBy: User;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  tickets: T[];
  total: number;
  page: number;
  limit: number;
}

// Form types
export interface CreateTicketRequest {
  title: string;
  description: string;
  priorityId?: string;
  categoryId?: string;
  departmentId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  dueDate?: string;
  attachmentIds?: string[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priorityId?: string;
  categoryId?: string;
  departmentId?: string;
  assigneeId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  dueDate?: string;
}

export interface AddCommentRequest {
  content: string;
  isInternal?: boolean;
  metadata?: Record<string, any>;
  attachmentIds?: string[];
}

export interface AssignTicketRequest {
  assigneeId: string;
  comment?: string;
}

// Dashboard stats
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  overdue: number;
} 