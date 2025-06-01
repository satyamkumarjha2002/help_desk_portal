'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  UserIcon,
  LogOutIcon,
  CameraIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  TrashIcon
} from 'lucide-react';

interface ProfileSheetProps {
  children: React.ReactNode;
}

export function ProfileSheet({ children }: ProfileSheetProps) {
  const { user, logout, updateProfileWithImage, changePassword } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.displayName || '',
      }));
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a valid image file"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive", 
          title: "File too large",
          description: "Image size should be less than 5MB"
        });
        return;
      }

      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validatePasswordChange = () => {
    if (formData.newPassword && !formData.currentPassword) {
      toast({
        variant: "destructive",
        title: "Current password required",
        description: "Current password is required to change password"
      });
      return false;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short", 
        description: "New password must be at least 6 characters long"
      });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "New passwords do not match"
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Validate password change if attempted
      if (formData.newPassword && !validatePasswordChange()) {
        return;
      }

      // Prepare update data
      const updateData: any = {};

      // Update display name if changed
      if (formData.displayName !== user?.displayName) {
        updateData.displayName = formData.displayName;
      }

      // Update profile and handle image upload
      if (profilePicture || Object.keys(updateData).length > 0) {
        await updateProfileWithImage(updateData, profilePicture || undefined);
      }

      // Handle password change
      if (formData.newPassword) {
        await changePassword(formData.currentPassword, formData.newPassword);
        toast({
          title: "Success!",
          description: "Profile and password updated successfully! You remain logged in."
        });
      } else {
        toast({
          title: "Success!",
          description: "Profile updated successfully!"
        });
      }
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      setProfilePicture(null);
      setProfilePicturePreview('');
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const currentProfileImage = profilePicturePreview || user?.profilePictureUrl;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Profile Settings</SheetTitle>
          <SheetDescription>
            Manage your account settings and preferences
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentProfileImage} alt={user?.displayName} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg">
                {user?.displayName ? getInitials(user.displayName) : <UserIcon className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <CameraIcon className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              {(profilePicture || user?.profilePictureUrl) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeProfilePicture}
                  disabled={loading}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={user?.role ? user.role.replace('_', ' ').toUpperCase() : 'USER'}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </div>

          <Separator />

          {/* Password Change */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Change Password</h3>
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 pb-2">
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>

            <Separator />

            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 