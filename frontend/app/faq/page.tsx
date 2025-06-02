'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AppHeader } from '@/components/app-header';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Clock,
  BookOpen,
  Search,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TicketIcon,
  Plus
} from 'lucide-react';
import { faqService, FAQResponse, Document } from '@/services/faqService';
import { withProtectedPage } from '@/lib/withAuth';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Document[];
  confidence?: number;
  interactionId?: string;
  feedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
  responseTimeMs?: number;
}

function FAQPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ticket creation state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [ticketAdditionalInfo, setTicketAdditionalInfo] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  useEffect(() => {
    loadKnowledgeBase();
    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        content: `Hi ${user?.displayName || 'there'}! 👋 I'm your AI assistant. I'm here to help answer your questions based on our knowledge base. Feel free to ask me anything!`,
        timestamp: new Date(),
      }
    ]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadKnowledgeBase = async () => {
    try {
      setDocumentsLoading(true);
      const result = await faqService.getDocuments(1, 10);
      setDocuments(result.documents);
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuestion,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);
    setError('');

    try {
      const response: FAQResponse = await faqService.askQuestion({
        question: currentQuestion,
      });

      const assistantMessage: ChatMessage = {
        id: response.interactionId,
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence,
        interactionId: response.interactionId,
        responseTimeMs: response.responseTimeMs,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError('Failed to get response. Please try again.');
      console.error('FAQ Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'not_helpful' | 'partially_helpful') => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.interactionId) return;

    try {
      await faqService.provideFeedback({
        interactionId: message.interactionId,
        feedback,
      });

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedback } : m
      ));
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const handleCreateTicketClick = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowTicketModal(true);
    setTicketAdditionalInfo('');
  };

  const handleCreateTicket = async () => {
    const message = messages.find(m => m.id === selectedMessageId);
    if (!message?.interactionId) return;

    setCreatingTicket(true);
    try {
      const ticket = await faqService.createTicketFromFaq({
        interactionId: message.interactionId,
        additionalInfo: ticketAdditionalInfo || undefined,
      });

      // Close modal and show success
      setShowTicketModal(false);
      setSelectedMessageId('');
      setTicketAdditionalInfo('');

      // Show success message and redirect option
      alert(`Ticket created successfully! Ticket ID: ${ticket.ticketNumber || ticket.id}`);
      
      // Optionally redirect to the ticket
      if (ticket.id) {
        window.open(`/tickets/${ticket.id}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setCreatingTicket(false);
    }
  };

  const formatConfidence = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    return `${percentage}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>

          {/* Message Content */}
          <div className={`px-4 py-2 rounded-lg ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}>
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {/* Message Metadata */}
            <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {message.responseTimeMs && (
                <span className="ml-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {message.responseTimeMs}ms
                </span>
              )}
            </div>

            {/* Confidence Score */}
            {message.confidence !== undefined && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${getConfidenceColor(message.confidence)}`}>
                <AlertCircle className="w-3 h-3" />
                Confidence: {formatConfidence(message.confidence)}
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Sources ({message.sources.length}):
                </div>
                <div className="space-y-1">
                  {message.sources.map((source, index) => (
                    <div key={source.id} className="text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}. {source.title}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Buttons */}
            {!isUser && message.interactionId && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Was this helpful?</span>
                <Button
                  size="sm"
                  variant={message.feedback === 'helpful' ? 'default' : 'ghost'}
                  onClick={() => handleFeedback(message.id, 'helpful')}
                  className="h-6 px-2"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={message.feedback === 'not_helpful' ? 'destructive' : 'ghost'}
                  onClick={() => handleFeedback(message.id, 'not_helpful')}
                  className="h-6 px-2"
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateTicketClick(message.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <TicketIcon className="w-3 h-3 mr-1" />
                    Create Ticket
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[70vh] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Ask me anything about our services and I'll help you find the answers!
                </CardDescription>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4">
                {messages.map(renderMessage)}
                
                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-gray-600 dark:text-gray-300">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <div className="p-4 border-t">
                {error && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !currentQuestion.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Knowledge Base Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Knowledge Base
                </CardTitle>
                <CardDescription>
                  Browse our documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Link href="/faq/knowledge-base">
                    <Button variant="outline" className="w-full" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Browse All Documents
                    </Button>
                  </Link>
                </div>
                
                {documentsLoading ? (
                  <div className="space-y-3">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                      Recent Documents:
                    </div>
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <h4 className="font-medium text-sm mb-1">{doc.title}</h4>
                        {doc.summary && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {doc.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge variant="secondary" className="text-xs">
                            {doc.usageCount} uses
                          </Badge>
                          {doc.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {documents.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href="/faq/knowledge-base">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View all {documents.length} documents
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Create Support Ticket
            </DialogTitle>
            <DialogDescription>
              Create a support ticket from this FAQ conversation. Our AI will automatically generate the ticket details based on your conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="additional-info">
                Additional Information (Optional)
              </Label>
              <Textarea
                id="additional-info"
                placeholder="Add any additional details or context that might help our support team..."
                value={ticketAdditionalInfo}
                onChange={(e) => setTicketAdditionalInfo(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTicketModal(false)}
              disabled={creatingTicket}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateTicket}
              disabled={creatingTicket}
            >
              {creatingTicket ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withProtectedPage(FAQPage); 