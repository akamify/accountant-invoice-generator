
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  getAuth, 
  type Auth, 
  connectAuthEmulator,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
  sendEmailVerification,
  applyActionCode,
  verifyPasswordResetCode as verifyPasswordResetCodeFirebase,
  confirmPasswordReset as confirmPasswordResetFirebase
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, database } from '@/lib/firebase';
import { ref, set, get, update } from 'firebase/database';

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt?: number;
  updatedAt?: number;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  verifyPasswordResetCode: (code: string) => Promise<string>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  // OTP Verification
  sendOtp: (phoneNumber: string) => Promise<string>;
  verifyOtp: (verificationId: string, code: string) => Promise<boolean>;
  resetOtp: () => void;
  updateUser: (data: Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>) => Promise<void>;
  reloadUser: () => Promise<void>;
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
    // Additional fields will be loaded from the database
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const googleProvider = new GoogleAuthProvider();

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
        setUser(prev => ({
          ...prev!,
          ...userData
        }));
      } else {
        // Create user document if it doesn't exist
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || null,
          role: 'user',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        try {
          await set(userRef, newUser);
          setUser(newUser);
        } catch (error) {
          console.error('Error creating user document:', error);
          // Even if we can't save to the database, we can still set the user state
          // with the basic auth info
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user'
          });
        }
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      // Don't throw the error, just log it and continue with basic auth info
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: 'user'
      });
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser);
        setIsEmailVerified(firebaseUser.emailVerified);
      } else {
        setUser(null);
        setIsEmailVerified(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserData]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = mapFirebaseUser(userCredential.user);
      setCurrentUser(userData);
      setIsEmailVerified(userCredential.user.emailVerified);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      // Check if Google provider is enabled
      if (!googleProvider) {
        throw new Error('Google Sign-In is not properly configured');
      }

      // Set custom parameters for Google Auth
      googleProvider.setCustomParameters({
        prompt: 'select_account',  // Forces account selection even when one account is available
      });

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // If user closed the popup or cancelled the sign-in
      if (!firebaseUser) {
        toast.info('Google sign in was cancelled');
        return;
      }
      
      const userData = mapFirebaseUser(firebaseUser);
      setIsEmailVerified(firebaseUser.emailVerified);
      
      // Check if user exists in database
      const userRef = ref(database, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        // Create user document if it doesn't exist
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || null,
          role: 'user',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await set(userRef, newUser);
        setCurrentUser(newUser);
      } else {
        setCurrentUser(userData);
      }
      
      return;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      // Handle specific error when user closes the popup
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request' ||
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
        toast.error('Failed to sign in with Google. Please try again.');
      }
      
      // Don't throw the error to prevent unhandled promise rejection
      return;
    }
  };

  const signup = async (displayName: string, email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (password.length < 6) {
        throw new Error('Password should be at least 6 characters');
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try {
        // Update user profile with display name
        if (displayName) {
          await updateProfile(user, { displayName });
        }
        
        // Create user document in the database
        const userRef = ref(database, `users/${user.uid}`);
        const newUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName || user.displayName || '',
          photoURL: user.photoURL || null,
          role: 'user',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        await set(userRef, newUser);
        setCurrentUser(newUser);
        
        // Send email verification with error handling
        try {
          await sendEmailVerification(user);
          toast.success('Verification email sent. Please check your inbox.');
        } catch (emailError) {
          console.error('Email verification error:', emailError);
          // Don't fail the signup if email verification fails
          toast.warning('Account created, but failed to send verification email. You can request a new one later.');
        }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Failed to create an account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please use a different email or sign in.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
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

  const verifyEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }
    await sendEmailVerification(auth.currentUser);
  };

  const verifyPasswordResetCode = async (code: string): Promise<string> => {
    try {
      return await verifyPasswordResetCodeFirebase(auth, code);
    } catch (error) {
      console.error('Verify password reset code error:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (code: string, newPassword: string) => {
    try {
      await confirmPasswordResetFirebase(auth, code, newPassword);
    } catch (error) {
      console.error('Confirm password reset error:', error);
      throw error;
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      setIsEmailVerified(updatedUser.emailVerified);
      setCurrentUser(mapFirebaseUser(updatedUser));
    }
  };

  const updateUser = async (data: Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const userRef = ref(database, `users/${currentUser.uid}`);
    await update(userRef, data);
    setCurrentUser(prev => ({ ...prev!, ...data }));
  };

  // Send OTP to phone number
  const sendOtp = async (phoneNumber: string): Promise<string> => {
    try {
      // Format phone number if needed
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Initialize reCAPTCHA verifier
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      
      try {
        const confirmation = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        return confirmation.verificationId;
      } catch (error: any) {
        console.error('Error sending OTP:', error);
        throw new Error(error.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Error initializing reCAPTCHA:', error);
      throw new Error('Failed to initialize reCAPTCHA');
    }
  };

  // Verify OTP code
  const verifyOtp = async (verificationId: string, code: string): Promise<boolean> => {
    if (!confirmationResult) {
      throw new Error('No active verification session');
    }

    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const result = await signInWithCredential(auth, credential);
      setCurrentUser(mapFirebaseUser(result.user));
      return true;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid verification code');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('Verification code has expired');
      } else {
        throw new Error(error.message || 'Failed to verify OTP');
      }
    }
  };

  // Reset OTP state
  const resetOtp = () => {
    setVerificationId(null);
    setConfirmationResult(null);
  };

  useEffect(() => {
    // Clean up function
    return () => {
      resetOtp();
    };
  }, []);

  return (
    <AuthContext.Provider 
      value={{
        user: currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        isEmailVerified,
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
        // OTP Verification
        sendOtp,
        verifyOtp,
        resetOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
