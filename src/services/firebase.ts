import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

const resolvedConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)',
};

export const app = initializeApp({
  apiKey: resolvedConfig.apiKey,
  authDomain: resolvedConfig.authDomain,
  projectId: resolvedConfig.projectId,
  storageBucket: resolvedConfig.storageBucket,
  messagingSenderId: resolvedConfig.messagingSenderId,
  appId: resolvedConfig.appId
});

export const auth = getAuth(app);

// Initialize Firestore with experimentalAutoDetectLongPolling enabled
// to ensure rock-solid connectivity in sandboxed iframes, proxies, and restricted networks
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  resolvedConfig.firestoreDatabaseId
);

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Predefined admin emails
export const PREDEFINED_ADMINS = [
  'blithesweeps@gmail.com',
  'sachet61@gmail.com',
  'admin@aetherpay.com',
  'support@aetherpay.com'
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'config', 'main'));
    return snap.exists();
  } catch (error: any) {
    console.warn('Firestore connectivity check status:', error?.message);
    return false;
  }
}
