'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Camera, 
  Shield, 
  Key, 
  Bell,
  Moon,
  Sun,
  Monitor,
  Save,
  ArrowLeft,
  Edit3,
  UserCheck,
  Building,
  MapPin,
  Phone,
  Calendar,
  Activity,
  Settings,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { withProtectedPage } from '@/lib/withAuth';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface ProfileFormData {
  displayName: string;
  email: string;
  profilePictureUrl: string;
}

interface SecurityFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ProfilePage() {
  const { user, updateProfileWithImage, changePassword, deleteAccount, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [profileData, setProfileData] = useState<ProfileFormData>({
    displayName: '',
    email: '',
    profilePictureUrl: ''
  });
  
  const [securityData, setSecurityData] = useState<SecurityFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
  });

  // Add state for delete account confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (!user) return;

    setProfileData({
      displayName: user.displayName || '',
      email: user.email || '',
      profilePictureUrl: user.profilePictureUrl || ''
    });

    // Initialize preferences from user data
    if (user.preferences) {
      setPreferences({
        emailNotifications: user.preferences.emailNotifications ?? true,
        pushNotifications: user.preferences.pushNotifications ?? true,
        smsNotifications: user.preferences.smsNotifications ?? false
      });
    }
  }, [user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case UserRole.TEAM_LEAD:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case UserRole.AGENT:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatRoleName = (role?: UserRole) => {
    if (!role) return 'User';
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      await updateProfileWithImage(profileData, profileImageFile || undefined);
      setSaveSuccess(true);
      setProfileImageFile(null);
      setImagePreview(null);
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      // Handle error silently or show user-friendly message
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await changePassword(securityData.currentPassword, securityData.newPassword);
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: "There was an error changing your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await deleteAccount();
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted",
        variant: "default",
      });
      // Redirect to login page after successful deletion
      router.push('/login');
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: `Account deletion failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      await updateProfileWithImage({
        preferences: preferences
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // user is guaranteed to exist here because of withAuth wrapper
  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'account', label: 'Account', icon: UserCheck }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 border-l border-gray-300 dark:border-gray-700" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Profile Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Overview Card */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-24 w-24 ring-4 ring-gray-200 dark:ring-gray-700">
                      <AvatarImage 
                        src={imagePreview || profileData.profilePictureUrl} 
                        alt={profileData.displayName} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg">
                        {getInitials(profileData.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          getRoleBadgeColor(user.role)
                        )}
                      >
                        {formatRoleName(user.role)}
                      </Badge>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {profileData.displayName || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {profileData.email}
                  </p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">24</div>
                      <div className="text-xs text-gray-500">Tickets</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">7</div>
                      <div className="text-xs text-gray-500">Resolved</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Tabs */}
            <Card className="border-0 shadow-lg mt-6">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                          activeTab === tab.id
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* General Tab */}
            {activeTab === 'general' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>General Information</span>
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Profile Picture Upload */}
                    <div>
                      <Label className="text-sm font-medium">Profile Picture</Label>
                      <div className="mt-2 flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage 
                            src={imagePreview || profileData.profilePictureUrl} 
                            alt={profileData.displayName} 
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            {getInitials(profileData.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageChange}
                            className="hidden"
                            id="profile-picture"
                          />
                          <Label htmlFor="profile-picture" className="cursor-pointer">
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span>
                                <Camera className="h-4 w-4 mr-2" />
                                Change Photo
                              </span>
                            </Button>
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            JPG, PNG up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="displayName">Full Name</Label>
                        <Input
                          id="displayName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            displayName: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      {saveSuccess && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Profile updated successfully!</span>
                        </div>
                      )}
                      <div className="ml-auto">
                        <Button type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your password and account security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSecuritySubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={securityData.newPassword}
                          onChange={(e) => setSecurityData(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={securityData.confirmPassword}
                          onChange={(e) => setSecurityData(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Customize your experience and notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <Label className="text-sm font-medium">Theme</Label>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: Monitor }
                        ].map((themeOption) => {
                          const Icon = themeOption.icon;
                          return (
                            <button
                              key={themeOption.value}
                              type="button"
                              onClick={() => setTheme(themeOption.value)}
                              className={cn(
                                "flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-colors",
                                theme === themeOption.value
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-sm font-medium">{themeOption.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Settings */}
                    <div>
                      <Label className="text-sm font-medium">Notifications</Label>
                      <div className="mt-3 space-y-3">
                        {[
                          { id: 'emailNotifications', label: 'Email notifications', description: 'Receive updates via email' },
                          { id: 'pushNotifications', label: 'Push notifications', description: 'Browser push notifications' },
                          { id: 'smsNotifications', label: 'SMS notifications', description: 'Text message updates' }
                        ].map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{option.label}</div>
                              <div className="text-xs text-gray-500">{option.description}</div>
                            </div>
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={preferences[option.id as keyof typeof preferences]}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                [option.id as keyof typeof preferences]: e.target.checked
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      {saveSuccess && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Preferences updated successfully!</span>
                        </div>
                      )}
                      <div className="ml-auto">
                        <Button type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Preferences
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <UserCheck className="h-5 w-5" />
                    <span>Account Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your account settings and data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Account Information */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Account Created:</span>
                        <span className="text-gray-900 dark:text-white">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">User ID:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs">
                          {user?.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Role:</span>
                        <Badge className={getRoleBadgeColor(user?.role)}>
                          {formatRoleName(user?.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    
                    <Button 
                      variant="destructive" 
                      className="bg-red-600 hover:bg-red-700"
                      disabled={loading}
                      onClick={() => setShowDeleteConfirmation(true)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you absolutely sure? This action cannot be undone. This will permanently delete your account and remove your data from our servers."
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmVariant="destructive"
        isLoading={loading}
      />
      
      <Toaster />
    </div>
  );
}

// Use the HOC to protect this page
export default withProtectedPage(ProfilePage); 