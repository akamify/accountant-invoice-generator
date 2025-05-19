import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  type Auth, 
  connectAuthEmulator,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence 
} from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase services
let firebaseApp: FirebaseApp;
let auth: Auth;
let database: Database;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

const initFirebase = () => {
  if (!getApps().length) {
    try {
      // Initialize Firebase
      firebaseApp = initializeApp(firebaseConfig);
      
      // Initialize Firebase services
      auth = getAuth(firebaseApp);
      database = getDatabase(firebaseApp);
      storage = getStorage(firebaseApp);
      
      // Set persistence
      setPersistence(auth, browserLocalPersistence)
        .catch((error) => {
          console.error('Error setting auth persistence:', error);
        });
      
      // Initialize Analytics only in client-side and production environment
      if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        analytics = getAnalytics(firebaseApp);
      }

      // Connect to emulators in development
      // if (import.meta.env.DEV) {
      //   try {
      //     connectAuthEmulator(auth, 'http://localhost:9099');
      //     console.log('Connected to Auth Emulator!');
      //   } catch (e) {
      //     console.log('Auth emulator not connected', e);
      //   }
      // }
      
      return { firebaseApp, auth, database, storage, analytics };
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  } else {
    firebaseApp = getApp();
    auth = getAuth(firebaseApp);
    database = getDatabase(firebaseApp);
    storage = getStorage(firebaseApp);
    
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(firebaseApp);
    }
    
    return { firebaseApp, auth, database, storage, analytics };
  }
};

// Initialize Firebase
const { firebaseApp: app, auth: authService, database: db, storage: storageService, analytics: analyticsService } = initFirebase();

// Export initialized services
export { 
  app as firebaseApp, 
  authService as auth, 
  db as database, 
  storageService as storage, 
  analyticsService as analytics 
};

// Export types
export type { User as FirebaseUser } from 'firebase/auth';
import type { 
  DatabaseReference, 
  DataSnapshot,
  QueryConstraint,
  Query,
  QueryConstraintType
} from 'firebase/database';

export type {
  DatabaseReference,
  DataSnapshot,
  QueryConstraint,
  Query,
  QueryConstraintType
};

// Export database functions
export { 
  ref, 
  onValue, 
  set, 
  push, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo, 
  limitToLast, 
  startAfter, 
  endBefore, 
  limitToFirst 
} from 'firebase/database';
