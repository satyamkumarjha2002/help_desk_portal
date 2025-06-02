import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileProcessorService {
  /**
   * Extract text content from uploaded file
   * Handles different file types and encoding issues safely
   */
  async extractTextContent(file: Express.Multer.File): Promise<string> {
    const mimeType = file.mimetype.toLowerCase();
    
    try {
      switch (mimeType) {
        case 'text/plain':
          return this.extractPlainText(file.buffer);
        
        case 'text/markdown':
        case 'text/x-markdown':
          return this.extractPlainText(file.buffer);
        
        case 'application/pdf':
          return this.extractPdfText(file.buffer);
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return this.extractWordText(file.buffer);
        
        default:
          // For unsupported types, try to extract as text but safely
          return this.extractPlainTextSafely(file.buffer);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to extract text from file: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files with proper encoding detection
   */
  private extractPlainText(buffer: Buffer): string {
    try {
      // Try UTF-8 first
      const text = buffer.toString('utf-8');
      
      // Check if the text contains null bytes or other binary indicators
      if (text.includes('\0') || this.hasBinaryContent(text)) {
        throw new Error('File appears to contain binary data');
      }
      
      return this.sanitizeText(text);
    } catch (error) {
      // Fallback to Latin-1 encoding
      try {
        const text = buffer.toString('latin1');
        return this.sanitizeText(text);
      } catch (fallbackError) {
        throw new Error('Unable to decode text file with supported encodings');
      }
    }
  }

  /**
   * Safely extract text from potentially binary files
   */
  private extractPlainTextSafely(buffer: Buffer): string {
    try {
      // Convert buffer to string and remove null bytes and non-printable characters
      let text = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000)); // Limit to first 10KB
      
      // Remove null bytes and other problematic characters
      text = text.replace(/\0/g, '');
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      
      // If the resulting text is mostly unreadable, return a fallback message
      if (this.isTextMostlyUnreadable(text)) {
        return `[Binary file content - ${buffer.length} bytes]\nFile type: ${this.getMimeTypeDescription(buffer)}\nTo properly extract text from this file, please convert it to a supported text format.`;
      }
      
      return this.sanitizeText(text);
    } catch (error) {
      return `[Unable to extract text content from file - ${buffer.length} bytes]`;
    }
  }

  /**
   * Extract text from PDF files
   * Note: This is a placeholder - in production, you'd use a library like pdf-parse
   */
  private extractPdfText(buffer: Buffer): string {
    // For now, return a message indicating PDF processing is needed
    // In production, you would use libraries like:
    // - pdf-parse
    // - pdf2pic + OCR
    // - External services like Google Document AI
    
    return `[PDF Document - ${buffer.length} bytes]\n\nThis is a PDF file. To properly extract text content, please:\n1. Convert the PDF to a text file, or\n2. Copy and paste the text content manually when creating the document.\n\nPDF text extraction will be available in a future update.`;
  }

  /**
   * Extract text from Word documents
   * Note: This is a placeholder - in production, you'd use a library like mammoth
   */
  private extractWordText(buffer: Buffer): string {
    // For now, return a message indicating Word processing is needed
    // In production, you would use libraries like:
    // - mammoth (for .docx)
    // - node-word-extractor
    // - officegen
    
    return `[Word Document - ${buffer.length} bytes]\n\nThis is a Microsoft Word document. To properly extract text content, please:\n1. Save the document as a .txt file, or\n2. Copy and paste the text content manually when creating the document.\n\nWord document text extraction will be available in a future update.`;
  }

  /**
   * Check if text contains binary content indicators
   */
  private hasBinaryContent(text: string): boolean {
    // Check for null bytes
    if (text.includes('\0')) return true;
    
    // Check for high ratio of non-printable characters
    const nonPrintableCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g) || []).length;
    const ratio = nonPrintableCount / text.length;
    
    return ratio > 0.3; // If more than 30% non-printable, likely binary
  }

  /**
   * Check if extracted text is mostly unreadable
   */
  private isTextMostlyUnreadable(text: string): boolean {
    if (text.length < 10) return true;
    
    // Count readable characters (letters, numbers, common punctuation, whitespace)
    const readableCount = (text.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g) || []).length;
    const ratio = readableCount / text.length;
    
    return ratio < 0.5; // If less than 50% readable, consider it unreadable
  }

  /**
   * Sanitize extracted text content
   */
  private sanitizeText(text: string): string {
    // Remove null bytes
    text = text.replace(/\0/g, '');
    
    // Remove other problematic control characters but keep necessary whitespace
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove excessive whitespace but preserve structure
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    
    // Trim
    text = text.trim();
    
    // Ensure minimum content
    if (text.length < 3) {
      throw new Error('Extracted text content is too short or empty');
    }
    
    return text;
  }

  /**
   * Get a description of the mime type
   */
  private getMimeTypeDescription(buffer: Buffer): string {
    // Simple magic number detection
    const header = buffer.toString('hex', 0, 8).toLowerCase();
    
    if (header.startsWith('25504446')) return 'PDF Document';
    if (header.startsWith('504b0304')) return 'ZIP/Office Document';
    if (header.startsWith('d0cf11e0')) return 'Microsoft Office Document';
    if (header.startsWith('ffd8ff')) return 'JPEG Image';
    if (header.startsWith('89504e47')) return 'PNG Image';
    
    return 'Unknown binary file';
  }

  /**
   * Validate file for text extraction
   */
  validateFileForTextExtraction(file: Express.Multer.File): { valid: boolean; message?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'text/x-markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        message: `File size exceeds the maximum limit of ${maxSize / (1024 * 1024)}MB`,
      };
    }

    if (!supportedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        message: `Unsupported file type: ${file.mimetype}. Supported types: ${supportedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }
} 