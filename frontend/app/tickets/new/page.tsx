'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/ticketService';
import { departmentService } from '@/services/departmentService';
import { categoryService } from '@/services/categoryService';
import { priorityService } from '@/services/priorityService';
import { attachmentService } from '@/services/attachmentService';
import { faqService, FaqSuggestionResult } from '@/services/faqService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { FaqSuggestionModal } from '@/components/faq-suggestion-modal';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Loader2, 
  AlertCircle,
  FileIcon,
  ImageIcon,
  Lightbulb
} from 'lucide-react';
import { Department, Category, Priority, CreateTicketRequest } from '@/types';
import Link from 'next/link';
import { withProtectedPage } from '@/lib/withAuth';

function CreateTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    priorityId: '',
    categoryId: '',
    departmentId: '',
    tags: [],
  });
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzingForFaq, setAnalyzingForFaq] = useState(false);
  
  // FAQ suggestion state
  const [faqSuggestion, setFaqSuggestion] = useState<FaqSuggestionResult | null>(null);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [skipFaqAnalysis, setSkipFaqAnalysis] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [deptData, priorityData] = await Promise.all([
          departmentService.getActiveDepartments(),
          priorityService.getAllPriorities(),
        ]);
        
        setDepartments(deptData);
        setPriorities(priorityData);
      } catch (error) {
        setError('Failed to load form data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    // Fetch categories when department changes
    if (formData.departmentId && formData.departmentId.trim() !== '') {
      const fetchCategories = async () => {
        try {
          const categoryData = await categoryService.getCategoriesByDepartment(formData.departmentId as string);
          setCategories(categoryData);
        } catch (error) {
          setCategories([]);
        }
      };
      fetchCategories();
    } else {
      setCategories([]);
      setFormData(prev => ({ ...prev, categoryId: '' }));
    }
  }, [formData.departmentId]);

  const handleInputChange = (field: keyof CreateTicketRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      // Validate each file
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      newFiles.forEach(file => {
        const validation = attachmentService.validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });
      
      if (errors.length > 0) {
        setError(`File validation errors:\n${errors.join('\n')}`);
      }
      
      if (validFiles.length > 0) {
        setAttachments(prev => [...prev, ...validFiles]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      handleInputChange('tags', [...(formData.tags || []), tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (formData.title.length < 5) {
      setError('Title must be at least 5 characters long');
      return false;
    }
    if (formData.description.length < 10) {
      setError('Description must be at least 10 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If we haven't skipped FAQ analysis and content is substantial, check for FAQ suggestions first
    if (!skipFaqAnalysis && formData.title.length >= 10 && formData.description.length >= 20) {
      setAnalyzingForFaq(true);
      
      try {
        const suggestion = await faqService.analyzeTicketContent({
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          departmentId: formData.departmentId || undefined,
          categoryId: formData.categoryId || undefined,
        });

        if (suggestion.shouldRedirectToFaq && suggestion.confidence >= 0.6) {
          setFaqSuggestion(suggestion);
          setShowFaqModal(true);
          setAnalyzingForFaq(false);
          return; // Stop here and show the modal
        }
      } catch (error) {
        // If FAQ analysis fails, continue with ticket creation
        console.warn('FAQ analysis failed:', error);
      }
      
      setAnalyzingForFaq(false);
    }

    // Proceed with ticket creation
    await createTicket();
  };

  const createTicket = async () => {
    setLoading(true);
    setError('');

    try {
      // Clean up form data - remove empty strings for optional UUID fields
      const cleanedData: CreateTicketRequest = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
      };

      // Only include optional fields if they have valid values
      if (formData.priorityId && formData.priorityId.trim() !== '') {
        cleanedData.priorityId = formData.priorityId;
      }
      
      if (formData.categoryId && formData.categoryId.trim() !== '') {
        cleanedData.categoryId = formData.categoryId;
      }
      
      if (formData.departmentId && formData.departmentId.trim() !== '') {
        cleanedData.departmentId = formData.departmentId;
      }

      // Create the ticket first
      const ticket = await ticketService.createTicket(cleanedData);
      
      // Upload attachments if any
      if (attachments.length > 0) {
        try {
          await attachmentService.uploadMultipleFiles(attachments, ticket.id);
        } catch (attachmentError) {
          // Don't fail the ticket if attachments fail
        }
      }

      router.push(`/tickets/${ticket.id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithTicket = () => {
    setShowFaqModal(false);
    setSkipFaqAnalysis(true); // Skip analysis on next submit
    createTicket();
  };

  const handleRedirectToFaq = () => {
    if (faqSuggestion) {
      // Encode the suggested question and redirect to FAQ page
      const encodedQuestion = encodeURIComponent(faqSuggestion.suggestedQuestion);
      router.push(`/faq?question=${encodedQuestion}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    return attachmentService.formatFileSize(bytes);
  };

  const getFileIcon = (file: File) => {
    if (attachmentService.isImage(file.name)) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileIcon className="h-4 w-4" />;
  };

  // user is guaranteed to exist here because of withAuth wrapper
  if (!user) {
    return null;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading form data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Ticket</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Submit a new support request or report an issue
          </p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>
                Provide a clear title and detailed description of your issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of your issue"
                  className="mt-1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide detailed information about your issue, including steps to reproduce if applicable"
                  className="mt-1 min-h-[120px]"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
              <CardDescription>
                Help us route your ticket to the right team. These fields are optional - if left empty, our AI will automatically classify your ticket based on the content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Department */}
              <div>
                <Label htmlFor="department">Department (Optional)</Label>
                <Select 
                  value={formData.departmentId || 'auto'} 
                  onValueChange={(value) => handleInputChange('departmentId', value === 'auto' ? '' : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a department or leave empty for AI classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <span className="text-gray-500 italic">Let AI decide</span>
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Select 
                  value={formData.categoryId || 'auto'} 
                  onValueChange={(value) => handleInputChange('categoryId', value === 'auto' ? '' : value)}
                  disabled={!formData.departmentId && formData.departmentId !== ''}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={
                      formData.departmentId && formData.departmentId !== ''
                        ? "Select a category or leave empty for AI classification" 
                        : "Select a department first or leave empty for AI classification"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <span className="text-gray-500 italic">Let AI decide</span>
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="priority">Priority (Optional)</Label>
                <Select 
                  value={formData.priorityId || 'auto'} 
                  onValueChange={(value) => handleInputChange('priorityId', value === 'auto' ? '' : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select priority level or leave empty for AI classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <span className="text-gray-500 italic">Let AI decide</span>
                    </SelectItem>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.id} value={priority.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: priority.color }}
                          />
                          <span>{priority.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Classification Info */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      AI-Powered Classification
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Our AI analyzes your ticket title and description to automatically determine the most appropriate department, category, and priority. You can still manually select these fields if you prefer.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Add relevant tags to help categorize your ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder="Add a tag and press Enter"
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add Tag
                  </Button>
                </div>
                
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>
                Upload files, screenshots, or documents related to your issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload files or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF, DOC up to 10MB each
                      </p>
                    </div>
                  </Label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Attached Files:</h4>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file)}
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/tickets">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading || analyzingForFaq}>
              {analyzingForFaq ? (
                <>
                  <Lightbulb className="h-4 w-4 mr-2 animate-pulse" />
                  Checking FAQ...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </div>
        </form>

        {/* FAQ Suggestion Modal */}
        {faqSuggestion && (
          <FaqSuggestionModal
            isOpen={showFaqModal}
            onClose={() => setShowFaqModal(false)}
            suggestion={faqSuggestion}
            confidence={faqSuggestion.confidence}
            onProceedWithTicket={handleProceedWithTicket}
            onRedirectToFaq={handleRedirectToFaq}
          />
        )}
      </main>
    </div>
  );
}

// Use the HOC to protect this page
export default withProtectedPage(CreateTicketPage); 