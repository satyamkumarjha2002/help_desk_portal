'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  ArrowRight, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { FaqSuggestionResult } from '@/services/faqService';

interface FaqSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: FaqSuggestionResult;
  onProceedWithTicket: () => void;
  onRedirectToFaq: () => void;
  confidence: number;
}

export function FaqSuggestionModal({
  isOpen,
  onClose,
  suggestion,
  onProceedWithTicket,
  onRedirectToFaq,
  confidence
}: FaqSuggestionModalProps) {
  const [redirecting, setRedirecting] = useState(false);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (conf >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleRedirectToFaq = async () => {
    setRedirecting(true);
    onRedirectToFaq();
  };

  if (!suggestion.shouldRedirectToFaq) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <DialogTitle className="text-lg">We Might Be Able to Help You Right Now!</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Based on your ticket content, we found relevant information in our FAQ that might resolve your issue immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {/* Confidence Indicator */}
          <Alert className={`border ${getConfidenceColor(confidence)}`}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>Confidence: {getConfidenceText(confidence)}</strong> ({Math.round(confidence * 100)}%)
                </span>
                <Badge variant="outline" className={`text-xs ${getConfidenceColor(confidence)}`}>
                  {suggestion.reasoning}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Suggested Question */}
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Suggested FAQ Question</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-900 dark:text-blue-100 font-medium text-sm">
                  "{suggestion.suggestedQuestion}"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Relevant Documents */}
          {suggestion.relevantDocuments && suggestion.relevantDocuments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Relevant Knowledge Base Articles</CardTitle>
                <CardDescription className="text-sm">
                  These articles might contain the information you're looking for
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {suggestion.relevantDocuments.slice(0, 3).map((doc, index) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {doc.title}
                        </h4>
                        {doc.summary && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {doc.summary}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                        {Math.round(doc.relevanceScore * 100)}% relevant
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits of Using FAQ */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">
                    Get Instant Help
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                    FAQ provides immediate answers and step-by-step solutions. No waiting for agent responses!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-shrink-0 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onProceedWithTicket}
            className="order-2 sm:order-1"
          >
            Continue Creating Ticket
          </Button>
          <Button 
            onClick={handleRedirectToFaq}
            disabled={redirecting}
            className="order-1 sm:order-2"
          >
            {redirecting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                Try FAQ First
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 