import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  applyActionCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  User as FirebaseUser,
  UserCredential,
  ConfirmationResult,
  sendEmailVerification as sendEmailVerificationFirebase,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { auth, database } from '@/lib/firebase';

// Initialize Firestore
export const db = getFirestore();
import { ref, set, get, update } from 'firebase/database';



declare global {
  interface Window {
    recaptchaVerifier: any;
    recaptchaWidgetId: any;
    firebase: any;
  }
}

// Types
type User = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt?: number | any; // Allow Firestore Timestamp
  updatedAt?: number | any; // Allow Firestore Timestamp
};

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  confirmationResult: any;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<{ user: User }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  verifyPasswordResetCode: (code: string) => Promise<string>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  updateUser: (data: Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>) => Promise<void>;
  reloadUser: () => Promise<void>;
  setConfirmationResult: (result: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase User to our User type
const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
  if (!firebaseUser) return null;

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified || false,
  };
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const googleProvider = new GoogleAuthProvider();

  // Fetch user data from database
  const fetchUserData = useCallback(async (userId: string): Promise<Partial<User>> => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Partial<User>;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {};
    }
  }, []);

  // Load additional user data from Realtime Database
  const loadUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = ref(database, `users/${firebaseUser.uid}`);

      // First, try to get the user data
      let snapshot;
      try {
        snapshot = await get(userRef);
      } catch (error: any) {
        // If permission denied, it might be because the user document doesn't exist yet
        if (error.code === 'PERMISSION_DENIED') {
          console.log('User document does not exist, creating...');
          snapshot = { exists: () => false };
        } else {
          throw error;
        }
      }

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const user = {
          ...mapFirebaseUser(firebaseUser)!,
          ...userData
        };
        setUser(user);
        setCurrentUser(user);
        return user;
      } else {
        // Create user document if it doesn't exist
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || null,
          role: 'user',
          emailVerified: firebaseUser.emailVerified || false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          await set(userRef, newUser);
          setUser(newUser);
          setCurrentUser(newUser);
          return newUser;
        } catch (error) {
          console.error('Error creating user document:', error);
          // Even if we can't save to the database, we can still set the user state
          // with the basic auth info
          const basicUser = mapFirebaseUser(firebaseUser);
          if (basicUser) {
            setUser(basicUser);
            setCurrentUser(basicUser);
            return basicUser;
          }
        }
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      // Don't throw the error, just log it and continue with basic auth info
      const basicUser = mapFirebaseUser(firebaseUser);
      if (basicUser) {
        setUser(basicUser);
        setCurrentUser(basicUser);
        return basicUser;
      }
    }
    return null;
  }, []);

  // Handle auth state changes
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        // Check if email is verified
        const isVerified = firebaseUser.emailVerified;
        setIsEmailVerified(isVerified);

        // Load additional user data
        await loadUserData(firebaseUser);

        setIsAuthenticated(true);
      } else {
        setUser(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsEmailVerified(false);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadUserData]);

  // Login with email and password
  const login = async (email: string, password: string): Promise<void> => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log('Attempting to login with email:', email);
      setIsLoading(true);

      // Clear any verification-related URL parameters
      const url = new URL(window.location.href);
      const hasVerificationParams = url.searchParams.has('oobCode') ||
        url.searchParams.has('mode') ||
        url.searchParams.has('apiKey');

      if (hasVerificationParams) {
        console.log('Clearing verification parameters from URL');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      console.log('Calling Firebase signInWithEmailAndPassword');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase login successful, user:', userCredential.user);

      // Get additional user data from database
      const userData = await loadUserData(userCredential.user);
      console.log('User data loaded:', userData);

      // Update state with the latest data
      const user = {
        ...mapFirebaseUser(userCredential.user)!,
        ...userData
      };

      console.log('Login successful');

      // Set authentication state
      setUser(user);
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(user.emailVerified);

      // Clear any verification state from localStorage
      localStorage.removeItem('emailForSignIn');

      // Show success message
      toast.success('Successfully logged in!');

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to log in';

      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid login credentials. Please check your email and password.';
            break;
          default:
            errorMessage = error.message || 'An error occurred during login';
        }
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signup = async (displayName: string, email: string, password: string): Promise<{ user: User }> => {
    try {
      setIsLoading(true);

      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;

      // Update user profile with display name
      await updateProfile(firebaseUser, { displayName });

      // Create user data for Firestore
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        photoURL: firebaseUser.photoURL || null,
        emailVerified: false, // Will be set to true after email verification
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save user data to Realtime Database
      const userRef = ref(database, `users/${firebaseUser.uid}`);
      await set(userRef, userData);

      // Update local state
      setUser(userData);
      setCurrentUser(userData);
      setIsAuthenticated(true);

// Return the user data
      return {
        user: userData
      };

    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account';

      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email is already in use';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Please try again later.';
            break;
          default:
            errorMessage = error.message || 'An error occurred during signup';
        }
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with Google
  const loginWithGoogle = async (): Promise<void> => {
    try {
      console.log('Starting Google sign in');
      setIsLoading(true);

      // Clear any verification-related URL parameters
      const url = new URL(window.location.href);
      const hasVerificationParams = url.searchParams.has('oobCode') ||
        url.searchParams.has('mode') ||
        url.searchParams.has('apiKey');

      if (hasVerificationParams) {
        console.log('Clearing verification parameters from URL');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Initialize Google provider
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account',  // Forces account selection even when one account is available
      });

      console.log('Calling signInWithPopup');
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      console.log('Google sign in successful, user:', firebaseUser);

      // If user closed the popup or cancelled the sign-in
      if (!firebaseUser) {
        console.log('Google sign in was cancelled');
        toast.info('Google sign in was cancelled');
        return;
      }

      // Load or create user data
      const userData = await loadUserData(firebaseUser);
      const isVerified = firebaseUser.emailVerified;

      console.log('User data loaded:', userData);
      console.log('Email verified:', isVerified);

      // Update state with the latest data
      const updatedUser = {
        ...mapFirebaseUser(firebaseUser)!,
        ...userData
      };

      setUser(updatedUser);
      setCurrentUser(updatedUser);
      setIsAuthenticated(true);
      setIsEmailVerified(isVerified);

      console.log('Google login successful, email verified:', isVerified);
      toast.success('Successfully logged in with Google');

    } catch (error: any) {
      console.error('Google sign in error:', error);

      // Handle specific error when user closes the popup
      if (error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.message?.includes('popup closed')) {
        toast.info('Google sign in was cancelled');
      }
      // Handle account exists with different credential
      else if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error('An account already exists with the same email but different sign-in credentials');
      }
      // Handle operation not allowed
      else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Google Sign-In is not enabled. Please contact support.');
        console.error('Google Sign-In is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method');
      }
      // Handle other errors
      else {
        const errorMessage = error.message || 'Failed to sign in with Google. Please try again.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify email
  const verifyEmail = useCallback(async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }
      await sendEmailVerification(auth.currentUser);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Verify email error:', error);
      toast.error(error.message || 'Failed to send verification email');
      throw error;
    }
  }, []);

  // Verify password reset code
  const verifyPasswordResetCode = async (code: string): Promise<string> => {
    try {
      return await firebaseVerifyPasswordResetCode(auth, code);
    } catch (error) {
      console.error('Verify password reset code error:', error);
      throw error;
    }
  };

  // Confirm password reset
  const confirmPasswordReset = async (code: string, newPassword: string): Promise<void> => {
    try {
      await firebaseConfirmPasswordReset(auth, code, newPassword);
      toast.success('Password has been reset successfully. You can now log in with your new password.');
    } catch (error) {
      console.error('Confirm password reset error:', error);
      let errorMessage = 'Failed to reset password';

      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = 'The password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid password reset link. Please request a new one.';
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Reload user data
  const reloadUser = async (): Promise<void> => {
    if (!auth.currentUser) return;
    
    try {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      const userData = await fetchUserData(updatedUser.uid);
      
      const user = {
        ...mapFirebaseUser(updatedUser)!,
        ...userData
      };
      
      setUser(user);
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(updatedUser.emailVerified);
    } catch (error) {
      console.error('Error reloading user:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUser = async (data: Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>) => {
    if (!auth.currentUser) return;

    try {
      // Update Firebase Auth profile
      if (data.displayName || data.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName: data.displayName || undefined,
          photoURL: data.photoURL || undefined,
        });
      }

      // Update user data in database
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      await update(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setUser(prev => ({
        ...prev!,
        ...data,
      }));
      setCurrentUser(prev => ({
        ...prev!,
        ...data,
      }));

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);

      // Clear all auth state
      setUser(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);

      // Clear any stored tokens or session data
      localStorage.removeItem('authToken');
      sessionStorage.clear();

      // Clear any pending redirects or auth state
      if (window.location.pathname.startsWith('/verify-email')) {
        // If we're on the verify email page, redirect to login
        window.location.href = '/login';
        return;
      }

      toast.success('Successfully logged out');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Failed to log out');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      toast.error(error.message || 'Failed to send password reset email');
      throw error;
    }
  };

  // Context value
  const contextValue = {
    user,
    currentUser,
    isAuthenticated,
    isLoading,
    isEmailVerified,
    confirmationResult,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    verifyEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
    updateUser,
    reloadUser,
    setConfirmationResult,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
