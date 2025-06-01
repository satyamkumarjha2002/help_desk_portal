'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { 
  EyeIcon, 
  EyeOffIcon, 
  Loader2, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User,
  ArrowRight,
  HelpCircle,
  Sparkles,
  CheckCircle,
  Camera,
  Upload
} from 'lucide-react';
import { withAuthOnlyPage } from '@/lib/withAuth';

function RegisterPage() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signUp } = useAuth();
  const router = useRouter();

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
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(formData.email, formData.password, formData.displayName, profilePicture || undefined);
      // Don't manually redirect - let AuthWrapper handle it
    } catch (error: any) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-3 relative overflow-hidden">
      {/* Theme Switcher */}
      <div className="absolute top-3 right-3 z-20">
        <ThemeSwitcher />
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-r from-purple-200/30 to-blue-200/30 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-green-200/30 dark:from-blue-900/20 dark:to-green-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-3 relative z-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5">
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Help Desk Portal
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create your account to get started</p>
        </div>

        {/* Main Card */}
        <Card className="backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 border-0 shadow-xl shadow-purple-500/10 dark:shadow-purple-500/20">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Create Account</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Join our help desk portal today
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 py-2">
                  <AlertDescription className="text-sm text-red-700 dark:text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Profile Picture Upload */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={profilePicturePreview} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm">
                      {formData.displayName 
                        ? formData.displayName.split(' ').map(n => n[0]).join('').toUpperCase() 
                        : <User className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="h-8 text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Photo
                    </Button>
                    {profilePicture && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeProfilePicture}
                        disabled={loading}
                        className="h-8 text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="displayName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="displayName"
                      name="displayName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.displayName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="pl-8 h-9 text-sm border-gray-200 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700/50"
                    />
                    <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="pl-8 h-9 text-sm border-gray-200 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700/50"
                    />
                    <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="pl-8 pr-8 h-9 text-sm border-gray-200 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700/50"
                      />
                      <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-3 w-3 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-3 w-3 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="pl-8 pr-8 h-9 text-sm border-gray-200 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700/50"
                      />
                      <CheckCircle className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-3 w-3 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-3 w-3 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-full rounded ${
                            passwordStrength && passwordStrength >= level
                              ? level <= 2
                                ? 'bg-red-400'
                                : level === 3
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Password strength: {
                        !passwordStrength ? 'Very weak' :
                        passwordStrength <= 2 ? 'Weak' :
                        passwordStrength === 3 ? 'Good' : 'Strong'
                      }
                    </p>
                  </div>
                )}

                {formData.confirmPassword && formData.password && formData.confirmPassword !== formData.password && (
                  <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center">
                <input
                  id="agree-terms"
                  name="agree-terms"
                  type="checkbox"
                  required
                  className="h-3 w-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-xs text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <Link href="/terms" className="text-purple-600 hover:text-purple-500 font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-500 font-medium">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 pt-3">
              <Button 
                type="submit" 
                className="w-full h-9 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-sm" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-purple-600 hover:text-purple-500 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-600">
            <ShieldCheck className="h-3 w-3 text-green-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Secured with Firebase Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Use the HOC to redirect authenticated users
export default withAuthOnlyPage(RegisterPage); 