'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AppHeader } from '@/components/app-header';
import { 
  BookOpen,
  Plus,
  Upload,
  Edit,
  Trash2,
  Search,
  Filter,
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { faqService, Document, FAQAnalytics, CreateDocumentDto } from '@/services/faqService';
import { UserRole } from '@/types';
import { withProtectedPage } from '@/lib/withAuth';

interface DocumentFormData {
  title: string;
  content: string;
  summary: string;
  tags: string;
}

const initialFormData: DocumentFormData = {
  title: '',
  content: '',
  summary: '',
  tags: '',
};

function AdminFAQPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<FAQAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user has admin access
  const hasAdminAccess = user?.role && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }
    loadDocuments();
    loadAnalytics();
  }, [hasAdminAccess]);

  useEffect(() => {
    // Filter documents based on search term
    const filtered = documents.filter(doc =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDocuments(filtered);
  }, [documents, searchTerm]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const result = await faqService.getDocuments(1, 100);
      setDocuments(result.documents);
      setError('');
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const analyticsData = await faqService.getAnalytics(30);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const createData: CreateDocumentDto = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      await faqService.createDocument(createData);
      
      setSuccess('Document created successfully');
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
      await loadDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create document');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDocument || !formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const updateData: Partial<CreateDocumentDto> = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      await faqService.updateDocument(selectedDocument.id, updateData);
      
      setSuccess('Document updated successfully');
      setIsEditModalOpen(false);
      setFormData(initialFormData);
      setSelectedDocument(null);
      await loadDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update document');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile || !formData.title.trim()) {
      setError('File and title are required');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const tags = formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      await faqService.uploadDocument(
        uploadFile,
        formData.title.trim(),
        formData.summary.trim() || undefined,
        tags
      );
      
      setSuccess('Document uploaded successfully');
      setIsUploadModalOpen(false);
      setFormData(initialFormData);
      setUploadFile(null);
      await loadDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    setFormLoading(true);
    setError('');

    try {
      await faqService.deleteDocument(selectedDocument.id);
      
      setSuccess('Document deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
      await loadDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (document: Document) => {
    setSelectedDocument(document);
    setFormData({
      title: document.title,
      content: document.content,
      summary: document.summary || '',
      tags: document.tags.join(', '),
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (document: Document) => {
    setSelectedDocument(document);
    setIsDeleteDialogOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsUploadModalOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedDocument(null);
    setFormData(initialFormData);
    setUploadFile(null);
    setError('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page. Only system administrators can manage the FAQ system.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              FAQ Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your knowledge base and AI assistant content
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadDocuments}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsUploadModalOpen(true)} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground">
                Active knowledge base entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : analytics?.totalInteractions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Questions asked (last 30 days)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : `${analytics?.avgResponseTimeMs || 0}ms`}
              </div>
              <p className="text-xs text-muted-foreground">
                AI response speed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsLoading ? '...' : (
                  analytics?.feedbackStats 
                    ? `${Math.round(
                        (analytics.feedbackStats.find(f => f.feedback === 'helpful')?.count || 0) /
                        analytics.feedbackStats.reduce((sum, f) => sum + f.count, 0) * 100
                      )}%`
                    : 'N/A'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Positive feedback rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by title, content, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Base Documents ({filteredDocuments.length})
            </CardTitle>
            <CardDescription>
              Manage your FAQ knowledge base content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array(10).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'No documents found matching your search.' : 'No documents found. Create your first document to get started.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {doc.title}
                        </h3>
                        <Badge variant="secondary">
                          {doc.usageCount} uses
                        </Badge>
                      </div>
                      
                      {doc.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {doc.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>By {doc.uploadedBy.displayName}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        {doc.fileSize && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </>
                        )}
                      </div>
                      
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditModal(doc)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Document
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(doc)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Document Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Document
            </DialogTitle>
            <DialogDescription>
              Add a new document to your knowledge base.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
                required
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description (optional)"
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter document content"
                className="min-h-[200px]"
                required
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModals}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Document
            </DialogTitle>
            <DialogDescription>
              Update the document content and metadata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditDocument} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
                required
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-summary">Summary</Label>
              <Input
                id="edit-summary"
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description (optional)"
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter document content"
                className="min-h-[200px]"
                required
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModals}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit className="h-4 w-4 mr-2" />
                )}
                Update Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </DialogTitle>
            <DialogDescription>
              Upload a file to extract content and add to your knowledge base.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadDocument} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                accept=".txt,.md,.pdf,.doc,.docx"
                required
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500">Supported formats: .txt, .md, .pdf, .doc, .docx</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
                required
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-summary">Summary</Label>
              <Input
                id="upload-summary"
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description (optional)"
                disabled={formLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-tags">Tags</Label>
              <Input
                id="upload-tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModals}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteDocument}
        title="Delete Document"
        description={
          selectedDocument 
            ? `Are you sure you want to delete "${selectedDocument.title}"? This action cannot be undone and will remove the document from your knowledge base.`
            : ''
        }
        confirmText="Delete"
        confirmVariant="destructive"
        isLoading={formLoading}
      />
    </div>
  );
}

export default withProtectedPage(AdminFAQPage); 