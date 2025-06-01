'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/ticketService';
import { departmentService } from '@/services/departmentService';
import { priorityService } from '@/services/priorityService';
import { attachmentService } from '@/services/attachmentService';
import { commentService } from '@/services/commentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AppHeader } from '@/components/app-header';
import { ThreadedComments } from '@/components/ui/threaded-comments';
import { 
  ArrowLeft, 
  Edit2, 
  MessageSquare, 
  User, 
  Calendar, 
  Building, 
  Tag, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Send,
  Paperclip
} from 'lucide-react';
import { 
  Ticket, 
  TicketStatus, 
  TicketComment, 
  CommentType,
  UpdateTicketRequest, 
  AddCommentRequest,
  Department,
  Priority,
  UserRole,
  Attachment
} from '@/types';
import Link from 'next/link';
import { withProtectedPage } from '@/lib/withAuth';
import { canUserEditTicket, canUserChangeTicketStatus } from '@/lib/ticketPermissions';

function TicketDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  
  // Attachment state
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  
  // Comment state - redesigned
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentPagination, setCommentPagination] = useState<any>(null);
  const [commentAttachmentsMap, setCommentAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  
  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateTicketRequest>({});

  useEffect(() => {
    if (!user || !ticketId) return;
    fetchTicketDetails();
    fetchFormData();
  }, [user, ticketId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const ticketData = await ticketService.getTicketById(ticketId);
      setTicket(ticketData);
      
      // Load comments and attachments separately
      await Promise.all([
        loadTicketComments(ticketData.id),
        loadTicketAttachments(ticketData.id)
      ]);
      
      // Initialize edit data
      setEditData({
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priorityId: ticketData.priority?.id,
        departmentId: ticketData.department?.id,
        tags: ticketData.tags,
      });
    } catch (error: any) {
      setError('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketComments = async (ticketId: string) => {
    try {
      setCommentsLoading(true);
      setCommentError('');
      
      // Use the new threaded comments endpoint
      const result = await commentService.getTicketCommentsThreaded(ticketId, 1, 50);
      setComments(result.comments);
      setCommentPagination(result.pagination);
      
      // No need to load attachments separately as they're included in the threaded response
    } catch (error: any) {
      setCommentError('Failed to load comments');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadTicketAttachments = async (ticketId: string) => {
    try {
      setAttachmentsLoading(true);
      setAttachmentError('');
      
      const attachments = await attachmentService.getTicketAttachments(ticketId);
      setTicketAttachments(attachments);
    } catch (error: any) {
      setAttachmentError('Failed to load attachments');
      setTicketAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [deptData, priorityData] = await Promise.all([
        departmentService.getActiveDepartments(),
        priorityService.getAllPriorities(),
      ]);
      setDepartments(deptData);
      setPriorities(priorityData);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;

    try {
      setUpdating(true);
      const updatedTicket = await ticketService.updateTicket(ticket.id, { status: newStatus });
      setTicket(updatedTicket);
      
      // Refresh to get updated comments
      await fetchTicketDetails();
    } catch (error: any) {
      setError('Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    // Validate comment content
    const validation = commentService.validateCommentContent(newComment);
    if (!validation.valid) {
      setError(validation.error || 'Invalid comment content');
      return;
    }

    try {
      setCommentLoading(true);
      setError('');
      
      const commentData = {
        content: newComment,
        ticketId: ticket.id,
        isInternal: false,
      };
      
      const comment = await commentService.addComment(commentData);
      
      // Upload comment attachments if any
      if (commentAttachments.length > 0) {
        try {
          await attachmentService.uploadMultipleFiles(commentAttachments, ticket.id, comment.id);
        } catch (attachmentError) {
          // Don't fail the comment if attachments fail
        }
      }
      
      setNewComment('');
      setCommentAttachments([]);
      
      // Refresh comments to show the new one
      await loadTicketComments(ticket.id);
    } catch (error: any) {
      setError(`Failed to add comment: ${error.message}`);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCommentFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setCommentAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeCommentAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
          <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
        <Paperclip className="w-3 h-3 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSaveEdit = async () => {
    if (!ticket) return;

    try {
      setUpdating(true);
      
      // Clean up edit data - remove empty optional fields
      const cleanedData: UpdateTicketRequest = {};
      
      if (editData.title && editData.title.trim() !== '') {
        cleanedData.title = editData.title;
      }
      if (editData.description && editData.description.trim() !== '') {
        cleanedData.description = editData.description;
      }
      if (editData.status) {
        cleanedData.status = editData.status;
      }
      if (editData.priorityId && editData.priorityId.trim() !== '') {
        cleanedData.priorityId = editData.priorityId;
      }
      if (editData.departmentId && editData.departmentId.trim() !== '') {
        cleanedData.departmentId = editData.departmentId;
      }
      if (editData.tags) {
        cleanedData.tags = editData.tags;
      }

      const updatedTicket = await ticketService.updateTicket(ticket.id, cleanedData);
      setTicket(updatedTicket);
      setIsEditing(false);
      
      // Refresh to get updated data
      await fetchTicketDetails();
    } catch (error: any) {
      setError('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case TicketStatus.PENDING:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case TicketStatus.RESOLVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case TicketStatus.CLOSED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case TicketStatus.CANCELLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return <AlertCircle className="h-4 w-4" />;
      case TicketStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4" />;
      case TicketStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case TicketStatus.RESOLVED:
        return <CheckCircle className="h-4 w-4" />;
      case TicketStatus.CLOSED:
        return <XCircle className="h-4 w-4" />;
      case TicketStatus.CANCELLED:
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: TicketStatus) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading ticket details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Ticket not found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The ticket you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild>
                <Link href="/tickets">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tickets
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tickets">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Link>
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  #{ticket.ticketNumber}
                </span>
                <Badge className={`${getStatusColor(ticket.status)} flex items-center gap-1`}>
                  {getStatusIcon(ticket.status)}
                  {formatStatus(ticket.status)}
                </Badge>
                {ticket.priority && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800" 
                      style={{ backgroundColor: ticket.priority.color }}
                    />
                    <span className="text-sm font-medium">{ticket.priority.name}</span>
                  </div>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {ticket.title}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {canUserChangeTicketStatus(user, ticket) && (
                <Select 
                  value={ticket.status} 
                  onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TicketStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                    <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                    <SelectItem value={TicketStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {canUserEditTicket(user, ticket) && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={updating}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editData.title || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editData.description || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 min-h-[120px]"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSaveEdit} disabled={updating}>
                        {updating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Comments ({comments.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[80px]"
                    disabled={commentLoading}
                  />
                  
                  {/* File Upload for Comments */}
                  <div className="space-y-3">
                    <div>
                      <input
                        type="file"
                        multiple
                        onChange={handleCommentFileUpload}
                        className="hidden"
                        id="comment-file-upload"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        disabled={commentLoading}
                      />
                      <Label htmlFor="comment-file-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Attach files (optional)
                          </span>
                        </div>
                      </Label>
                    </div>

                    {/* Selected Files Display */}
                    {commentAttachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selected files ({commentAttachments.length}):
                        </div>
                        <div className="space-y-2">
                          {commentAttachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                              {getFileIcon(file)}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{file.name}</div>
                                <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCommentAttachment(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                                disabled={commentLoading}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={commentLoading || !newComment.trim()}>
                      {commentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Add Comment
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {/* Comment Error State */}
                  {commentError && (
                    <Alert className="mb-4" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {commentError}
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => loadTicketComments(ticket.id)}
                          className="ml-2 h-auto p-0"
                        >
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Threaded Comments Component */}
                  <ThreadedComments
                    comments={comments}
                    currentUser={user!}
                    onCommentAdded={() => loadTicketComments(ticket.id)}
                    isLoading={commentsLoading}
                  />

                  {/* Pagination if needed */}
                  {commentPagination && commentPagination.totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                      <div className="text-sm text-gray-500">
                        Page {commentPagination.page} of {commentPagination.totalPages} 
                        ({commentPagination.total} total comments)
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Requester</div>
                      <div className="font-medium">{ticket.requester.displayName}</div>
                    </div>
                  </div>
                  
                  {ticket.assignee && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Assignee</div>
                        <div className="font-medium">{ticket.assignee.displayName}</div>
                      </div>
                    </div>
                  )}
                  
                  {ticket.department && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Department</div>
                        <div className="font-medium">{ticket.department.name}</div>
                      </div>
                    </div>
                  )}
                  
                  {ticket.category && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Category</div>
                        <div className="font-medium">{ticket.category.name}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Created</div>
                      <div className="font-medium">{formatDate(ticket.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Last Updated</div>
                      <div className="font-medium">{formatDate(ticket.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments - Redesigned */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attachments ({ticketAttachments.length})
                  </div>
                  {attachmentsLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachmentError && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {attachmentError}
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => loadTicketAttachments(ticket.id)}
                        className="ml-2 h-auto p-0"
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {attachmentsLoading ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading attachments...</p>
                  </div>
                ) : ticketAttachments.length > 0 ? (
                  <div className="space-y-3">
                    {ticketAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-shrink-0">
                          {attachmentService.isImage(attachment.originalFilename) ? (
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                              <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-gray-900 dark:text-white">
                            {attachment.originalFilename}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{attachmentService.formatFileSize(attachment.fileSize)}</span>
                            <span>•</span>
                            <span>{attachment.mimeType}</span>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              try {
                                const downloadUrl = attachmentService.getDownloadUrl(attachment);
                                window.open(downloadUrl, '_blank');
                              } catch (error) {
                                // Handle error silently
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {attachmentService.isImage(attachment.originalFilename) ? 'View' : 'Download'}
                          </Button>
                          
                          {/* Optional: Delete button for authorized users */}
                          {(user?.id === attachment.uploadedBy?.id || 
                            [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user?.role)) && (
                            <ConfirmationDialog
                              title="Delete Attachment"
                              description="Are you sure you want to delete this attachment? This action cannot be undone."
                              confirmText="Delete"
                              cancelText="Cancel"
                              variant="destructive"
                              onConfirm={async () => {
                                try {
                                  await attachmentService.deleteAttachment(attachment.id);
                                  await loadTicketAttachments(ticket.id);
                                } catch (error) {
                                  setError('Failed to delete attachment');
                                }
                              }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </ConfirmationDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No attachments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withProtectedPage(TicketDetailsPage); 