'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Reply, 
  User, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2
} from 'lucide-react';
import { TicketComment, CommentType, User as UserType } from '@/types';
import { commentService } from '@/services/commentService';

interface ThreadedCommentsProps {
  comments: TicketComment[];
  currentUser: UserType;
  onCommentAdded: () => void;
  isLoading?: boolean;
}

interface CommentItemProps {
  comment: TicketComment;
  currentUser: UserType;
  onReplyAdded: () => void;
  level?: number;
}

function CommentItem({ comment, currentUser, onReplyAdded, level = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [error, setError] = useState('');

  // Safety check - ensure comment exists and has required fields
  if (!comment || !comment.id) {
    return null;
  }

  const handleAddReply = async () => {
    if (!replyContent.trim()) return;

    try {
      setIsReplying(true);
      setError('');
      
      await commentService.addReply(comment.id, replyContent);
      
      setReplyContent('');
      setShowReplyForm(false);
      onReplyAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add reply');
    } finally {
      setIsReplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getCommentTypeColor = (type: CommentType) => {
    switch (type) {
      case CommentType.STATUS_CHANGE:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case CommentType.ASSIGNMENT:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case CommentType.ESCALATION:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case CommentType.REPLY:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const isSystemComment = comment.commentType !== CommentType.COMMENT && comment.commentType !== CommentType.REPLY;
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Handle null user (system comments or deleted users)
  const userName = comment.user?.displayName || 'System';
  const userAvatar = comment.user?.profilePictureUrl;
  const userInitial = userName.charAt(0).toUpperCase();
  const commentContent = comment.content || 'No content available';

  return (
    <div className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <Card className={`mb-4 ${isSystemComment ? 'border-dashed' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar} />
                <AvatarFallback>
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{userName}</span>
                  {comment.commentType !== CommentType.COMMENT && (
                    <Badge className={getCommentTypeColor(comment.commentType)}>
                      {comment.commentType.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {comment.isInternal && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Internal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(comment.createdAt)}</span>
                  {level > 0 && (
                    <>
                      <span>•</span>
                      <Reply className="h-3 w-3" />
                      <span>Reply</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1"
              >
                {showReplies ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-xs">{comment.replies!.length} replies</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {commentContent}
            </p>
          </div>

          {/* Reply button */}
          {!isSystemComment && level < 2 && ( // Limit nesting to 2 levels
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
            </div>
          )}

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px]"
              />
              
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddReply}
                  disabled={!replyContent.trim() || isReplying}
                  size="sm"
                >
                  {isReplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render replies */}
      {hasReplies && showReplies && (
        <div className="space-y-2">
          {comment.replies!
            .filter(reply => reply && reply.id) // Filter out null/invalid replies
            .map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                onReplyAdded={onReplyAdded}
                level={level + 1}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}

export function ThreadedComments({ comments, currentUser, onCommentAdded, isLoading }: ThreadedCommentsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Safety check for comments array
  if (!Array.isArray(comments)) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">Unable to load comments</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No comments yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Be the first to add a comment
        </p>
      </div>
    );
  }

  // Filter out invalid comments and handle safely
  const validComments = comments
    .filter(comment => {
      try {
        return comment && 
               comment.id && 
               typeof comment.content === 'string' &&
               comment.createdAt;
      } catch (error) {
        console.warn('Invalid comment detected:', comment);
        return false;
      }
    });

  if (validComments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No valid comments found</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          There may be data issues with the comments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validComments.map((comment) => {
        try {
          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onReplyAdded={onCommentAdded}
            />
          );
        } catch (error) {
          console.error('Error rendering comment:', comment.id, error);
          return (
            <Card key={comment.id} className="border-red-200 bg-red-50 dark:bg-red-900/10">
              <CardContent className="py-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Error loading comment. Please refresh the page.
                </p>
              </CardContent>
            </Card>
          );
        }
      })}
    </div>
  );
} 