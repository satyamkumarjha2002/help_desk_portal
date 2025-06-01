import api from '@/lib/api';
import { Attachment } from '@/types';

interface AttachmentResponse {
  success: boolean;
  data: Attachment | Attachment[];
  message: string;
}

interface UploadResponse {
  success: boolean;
  data: {
    attachments: Attachment[];
  };
  message: string;
}

/**
 * Redesigned Attachment Service - Robust Implementation
 * 
 * Provides comprehensive file management functionality with proper
 * error handling, validation, and consistent response formatting.
 */
export const attachmentService = {
  /**
   * Upload single file with enhanced error handling
   */
  async uploadFile(
    file: File, 
    ticketId: string, 
    commentId?: string
  ): Promise<Attachment> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', ticketId);
      if (commentId) {
        formData.append('commentId', commentId);
      }

      const response = await api.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data as AttachmentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return result.data as Attachment;
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: File[], 
    ticketId: string, 
    commentId?: string
  ): Promise<Attachment[]> {
    try {
      // Validate all files first
      for (const file of files) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
          throw new Error(`${file.name}: ${validation.error}`);
        }
      }

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('ticketId', ticketId);
      if (commentId) {
        formData.append('commentId', commentId);
      }

      const response = await api.post('/attachments/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data as UploadResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return result.data.attachments;
    } catch (error: any) {
      throw new Error(`Failed to upload files: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get attachment by ID
   */
  async getAttachment(id: string): Promise<Attachment> {
    try {
      const response = await api.get(`/attachments/${id}`);
      const result = response.data as AttachmentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get attachment');
      }

      return result.data as Attachment;
    } catch (error: any) {
      throw new Error(`Failed to get attachment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get attachments for a ticket
   */
  async getTicketAttachments(ticketId: string): Promise<Attachment[]> {
    try {
      const response = await api.get(`/attachments/ticket/${ticketId}`);
      const result = response.data as AttachmentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get attachments');
      }

      const attachments = result.data as Attachment[];
      return attachments;
    } catch (error: any) {
      // Return empty array instead of throwing for better UX
      return [];
    }
  },

  /**
   * Get attachments for a comment
   */
  async getCommentAttachments(commentId: string): Promise<Attachment[]> {
    try {
      const response = await api.get(`/attachments/comment/${commentId}`);
      const result = response.data as AttachmentResponse;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get comment attachments');
      }

      const attachments = result.data as Attachment[];
      return attachments;
    } catch (error: any) {
      // Return empty array instead of throwing for better UX
      return [];
    }
  },

  /**
   * Delete attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    try {
      const response = await api.delete(`/attachments/${id}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete attachment');
      }
    } catch (error: any) {
      throw new Error(`Failed to delete attachment: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Health check for attachment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/attachments/health/check');
      const result = response.data;
      
      return result.success && result.healthy;
    } catch (error) {
      return false;
    }
  },

  /**
   * Generate download URL for an attachment
   */
  getDownloadUrl(attachment: Attachment): string {
    // Generate Firebase Storage URL directly
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'helpdeskportal-default-storage';
    return `https://storage.googleapis.com/${bucketName}/${attachment.firebasePath}`;
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      // Archives
      'application/zip', 'application/x-rar-compressed',
      // Media
      'video/mp4', 'audio/mpeg', 'audio/wav',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.formatFileSize(maxSize)}`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    return { valid: true };
  },

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  },

  /**
   * Check if file is an image
   */
  isImage(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    return imageExtensions.includes(this.getFileExtension(filename));
  },

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get appropriate icon for file type
   */
  getFileTypeIcon(filename: string): string {
    const extension = this.getFileExtension(filename);
    
    if (this.isImage(filename)) {
      return '🖼️';
    }
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'zip':
      case 'rar':
        return '🗜️';
      case 'mp4':
        return '🎥';
      case 'mp3':
      case 'wav':
        return '🎵';
      default:
        return '📎';
    }
  }
}; 