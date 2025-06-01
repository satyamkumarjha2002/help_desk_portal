'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';
import api from '@/lib/api';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, profilePicture?: File) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<User>;
  updateProfileWithImage: (data: Partial<User>, profileImage?: File) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<string>;
  deleteProfilePicture: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setFirebaseUser(firebaseUser);
        
        if (firebaseUser) {
          // Get ID token to ensure it's valid
          const token = await firebaseUser.getIdToken();
          
          // Get user data from backend
          const response = await api.get('/auth/me');
          setUser(response.data.data?.user || response.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // If we can't fetch user data but Firebase user exists, 
        // it might be because the backend user doesn't exist yet
        if (firebaseUser) {
          console.warn('Firebase user exists but backend user not found, signing out...');
          await signOut(auth);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const uploadProfilePicture = async (file: File): Promise<string> => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated');
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `avatar.${fileExtension}`;
    const storageRef = ref(storage, `user-profiles/${firebaseUser.uid}/${fileName}`);
    
    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const deleteProfilePicture = async (): Promise<void> => {
    if (!firebaseUser || !user?.profilePicturePath) {
      return;
    }

    try {
      const storageRef = ref(storage, user.profilePicturePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token = await credential.user.getIdToken();
      
      // Verify token with backend
      const response = await api.post('/auth/login', { idToken: token });
      setUser(response.data.user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string, profilePicture?: File) => {
    setLoading(true);
    try {
      // Prepare form data for multipart upload
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('displayName', displayName);
      formData.append('role', UserRole.END_USER);

      // Add profile picture if provided
      if (profilePicture) {
        formData.append('profileImage', profilePicture);
      }

      // Register with backend (backend will handle Firebase user creation and file upload)
      const response = await api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Check if response has the expected structure
      if (!response.data || !response.data.data || !response.data.data.user) {
        throw new Error('Invalid response from server');
      }

      setUser(response.data.data.user);

      // Now sign in to Firebase with the created credentials
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(credential.user);
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Provide more specific error messages
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    try {
      const response = await api.patch('/auth/profile', data);
      setUser(response.data.user);
      
      // Update Firebase profile if display name or photo changed
      if (firebaseUser && (data.displayName || data.profilePictureUrl)) {
        await updateProfile(firebaseUser, {
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: data.profilePictureUrl || firebaseUser.photoURL
        });
      }
      
      return response.data.user;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const updateProfileWithImage = async (data: Partial<User>, profileImage?: File): Promise<User> => {
    try {
      if (profileImage) {
        // Use the new endpoint that supports file upload
        const formData = new FormData();
        
        // Add all update data to form data
        Object.keys(data).forEach(key => {
          const value = data[key as keyof User];
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        
        // Add profile image
        formData.append('profileImage', profileImage);
        
        const response = await api.patch('/auth/profile-with-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const updatedUser = response.data.data?.user || response.data.user;
        setUser(updatedUser);
        
        // Update Firebase profile
        if (firebaseUser) {
          await updateProfile(firebaseUser, {
            displayName: updatedUser.displayName || firebaseUser.displayName,
            photoURL: updatedUser.profilePictureUrl || firebaseUser.photoURL
          });
        }
        
        return updatedUser;
      } else {
        // Use the existing endpoint for updates without image
        return await updateUserProfile(data);
      }
    } catch (error) {
      console.error('Profile update with image error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!firebaseUser) {
        throw new Error('User must be authenticated');
      }

      // Re-authenticate user before changing password for security
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      
      const credential = EmailAuthProvider.credential(firebaseUser.email!, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update password in Firebase (this keeps the user logged in)
      await updatePassword(firebaseUser, newPassword);
      
      // No need to call backend as Firebase handles password management
      // The user should remain logged in after password change
      
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please sign in again before changing your password');
      }
      throw new Error(error.message || 'Failed to change password');
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    updateUserProfile,
    updateProfileWithImage,
    changePassword,
    uploadProfilePicture,
    deleteProfilePicture,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 