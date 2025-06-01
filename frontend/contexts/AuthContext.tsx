'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider
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
  deleteAccount: () => Promise<void>;
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
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        // Always set loading to false after authentication state is determined
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const uploadProfilePicture = async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `profile-pictures/${firebaseUser?.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      throw new Error('Failed to upload profile picture');
    }
  };

  const deleteProfilePicture = async (): Promise<void> => {
    if (!user || !user.profilePictureUrl) {
      return;
    }

    try {
      if (user.profilePictureUrl && user.profilePictureUrl.includes('firebasestorage.googleapis.com')) {
        const storageRef = ref(storage, user.profilePictureUrl);
        await deleteObject(storageRef);
      }
    } catch (error) {
      throw new Error('Failed to delete profile picture');
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
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
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

  const updateProfileWithImage = async (
    profileData?: Partial<User>, 
    imageFile?: File
  ) => {
    if (!user) throw new Error('No user logged in');

    try {
      setLoading(true);
      
      let profilePictureUrl = user.profilePictureUrl;
      
      if (imageFile) {
        if (user.profilePictureUrl) {
          await deleteProfilePicture();
        }
        profilePictureUrl = await uploadProfilePicture(imageFile);
      }

      const updateData = {
        ...profileData,
        ...(profilePictureUrl && { profilePictureUrl })
      };

      const response = await api.patch('/auth/profile-with-image', updateData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const updatedUser = { ...user, ...updateData };
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
        throw new Error(response.data.message || 'Profile update failed');
      }
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !auth.currentUser) throw new Error('No user logged in');

    try {
      setLoading(true);
      
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user || !auth.currentUser) throw new Error('No user logged in');

    try {
      setLoading(true);
      
      if (user.profilePictureUrl) {
        await deleteProfilePicture();
      }

      await api.patch('/auth/delete-account');
      await auth.currentUser.delete();
      
      setUser(null);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
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
    deleteAccount,
    uploadProfilePicture,
    deleteProfilePicture,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 