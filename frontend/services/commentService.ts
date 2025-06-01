import api from '@/lib/api';
import { TicketComment, CommentType } from '@/types';

interface CommentResponse {
  success: boolean;
  data: TicketComment | TicketComment[];
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AddCommentRequest {
  content: string;
  ticketId: string;
  isInternal?: boolean;
  type?: CommentType;
  metadata?: Record<string, any>;
}

interface UpdateCommentRequest {
  content?: string;
  isInternal?: boolean;
}

interface CommentStats {
  total: number;
  userComments: number;
  systemComments: number;
  internalComments: number;
  uniqueUsers: number;
  recentActivity: Array<{
    id: string;
    type: CommentType;
    user: string;
    createdAt: string;
    preview: string;
  }>;
}

/**
 * Redesigned Comment Service - Robust Implementation
 * 
 * Provides comprehensive comment management functionality with proper
 * error handling, validation, and consistent response formatting.
 */
export const commentService = {
  /**
   * Add comment to ticket with enhanced error handling
   */
  async addComment(commentData: AddCommentRequest): Promise<TicketComment> {
    try {
      const response = await api.post('/comments', commentData);
      const result = response.data as CommentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add comment');
      }

      return result.data as TicketComment;
    } catch (error: any) {
      throw new Error(`Failed to add comment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get comments for a ticket with pagination
   */
  async getTicketComments(
    ticketId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ comments: TicketComment[]; pagination: any }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const response = await api.get(`/comments/ticket/${ticketId}?${params.toString()}`);
      const result = response.data as CommentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get comments');
      }

      const comments = result.data as TicketComment[];
      
      return {
        comments,
        pagination: result.pagination || {
          page,
          limit,
          total: comments.length,
          totalPages: 1,
        },
      };
    } catch (error: any) {
      // Return empty result instead of throwing for better UX
      return {
        comments: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      };
    }
  },

  /**
   * Get comment by ID
   */
  async getComment(commentId: string): Promise<TicketComment> {
    try {
      const response = await api.get(`/comments/${commentId}`);
      const result = response.data as CommentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get comment');
      }

      return result.data as TicketComment;
    } catch (error: any) {
      throw new Error(`Failed to get comment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Update comment with validation
   */
  async updateComment(commentId: string, updateData: UpdateCommentRequest): Promise<TicketComment> {
    try {
      // Validate content if provided
      if (updateData.content !== undefined) {
        const validation = this.validateCommentContent(updateData.content);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }
      
      const response = await api.put(`/comments/${commentId}`, updateData);
      const result = response.data as CommentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update comment');
      }

      return result.data as TicketComment;
    } catch (error: any) {
      throw new Error(`Failed to update comment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const response = await api.delete(`/comments/${commentId}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete comment');
      }
    } catch (error: any) {
      throw new Error(`Failed to delete comment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get comment statistics for a ticket
   */
  async getCommentStats(ticketId: string): Promise<CommentStats> {
    try {
      const response = await api.get(`/comments/ticket/${ticketId}/stats`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get comment stats');
      }

      return result.data as CommentStats;
    } catch (error: any) {
      throw new Error(`Failed to get comment stats: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Health check for comment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/comments/health/check');
      const result = response.data;
      
      return result.success && result.healthy;
    } catch (error) {
      return false;
    }
  },

  /**
   * Validate comment content
   */
  validateCommentContent(content: string): { valid: boolean; error?: string } {
    if (!content || !content.trim()) {
      return {
        valid: false,
        error: 'Comment content cannot be empty',
      };
    }

    if (content.length > 5000) {
      return {
        valid: false,
        error: 'Comment content cannot exceed 5000 characters',
      };
    }

    if (content.length < 1) {
      return {
        valid: false,
        error: 'Comment content must be at least 1 character',
      };
    }

    return { valid: true };
  },

  /**
   * Format comment date for display with proper timezone handling
   */
  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Show relative time for recent comments
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      // For older comments, show formatted date in local timezone
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  },

  /**
   * Get full timestamp for tooltip
   */
  getFullTimestamp(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  },

  /**
   * Get comment type display text
   */
  getCommentTypeDisplay(commentType: CommentType): string {
    switch (commentType) {
      case CommentType.COMMENT:
        return 'Comment';
      case CommentType.STATUS_CHANGE:
        return 'Status Change';
      case CommentType.ASSIGNMENT:
        return 'Assignment';
      case CommentType.ESCALATION:
        return 'Escalation';
      case CommentType.MERGE:
        return 'Merge';
      case CommentType.SPLIT:
        return 'Split';
      default:
        return 'Unknown';
    }
  },

  /**
   * Check if comment is editable by current user
   */
  canEditComment(comment: TicketComment, currentUserId: string, userRole: string): boolean {
    // User can edit their own comments
    if (comment.userId === currentUserId) {
      return true;
    }

    // Admins can edit any comment
    if (['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return true;
    }

    return false;
  },

  /**
   * Check if comment is deletable by current user
   */
  canDeleteComment(comment: TicketComment, currentUserId: string, userRole: string): boolean {
    // System comments cannot be deleted
    if (comment.commentType !== CommentType.COMMENT) {
      return false;
    }

    // User can delete their own comments
    if (comment.userId === currentUserId) {
      return true;
    }

    // Admins can delete any comment
    if (['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return true;
    }

    return false;
  },

  /**
   * Get appropriate icon for comment type
   */
  getCommentTypeIcon(commentType: CommentType): string {
    switch (commentType) {
      case CommentType.COMMENT:
        return '💬';
      case CommentType.STATUS_CHANGE:
        return '🔄';
      case CommentType.ASSIGNMENT:
        return '👤';
      case CommentType.ESCALATION:
        return '⬆️';
      case CommentType.MERGE:
        return '🔗';
      case CommentType.SPLIT:
        return '✂️';
      default:
        return '📝';
    }
  },

  /**
   * Truncate comment content for preview
   */
  truncateContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}; 