/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

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

let firebaseAvailable = false;
let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

// Determine if config is validly populated
if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    // As per the skill mandate: The app will break without firestoreDatabaseId if configured
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    storage = getStorage(app);
    firebaseAvailable = true;
    console.log("Firebase initialized successfully with config.");
    
    // Validate Connection to Firestore on startup as mandated by security skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  } catch (error) {
    console.error("Firebase failed to initialize:", error);
  }
} else {
  console.log("Using Local Storage Fallback Mode - No apiKey in firebase-applet-config.json");
}

export { app, db, auth, storage, firebaseAvailable };

/**
 * Recursively removes any keys with `undefined` values from an object,
 * as Firestore does not allow `undefined` field values.
 */
export function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData);
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        sanitized[key] = sanitizeFirestoreData(val);
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Parses and maps Firebase Firestore errors into detailed, action-oriented, and user-friendly explanations.
 */
export function getFirestoreErrorMessage(error: any): string {
  if (!error) return 'An unknown database error occurred.';
  
  let rawMessage = error.message || String(error);
  
  // Try to parse out the JSON error message construct thrown by handleFirestoreError
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed && typeof parsed === 'object' && parsed.error) {
      rawMessage = parsed.error;
    }
  } catch (_) {
    // Treat as raw string message
  }

  const messageLower = rawMessage.toLowerCase();

  if (messageLower.includes('permission-denied') || messageLower.includes('insufficient permissions')) {
    return 'Database access denied. Your profile status or active workspace role is not authorized for this specific request.';
  }
  
  if (messageLower.includes('quota-exceeded') || messageLower.includes('quota exceeded') || messageLower.includes('resource-exhausted')) {
    return 'Database spark limit reached. The daily free cloud persistence transactions have been exhausted. Please contact support or try again tomorrow.';
  }
  
  if (messageLower.includes('offline') || messageLower.includes('network') || messageLower.includes('internet') || messageLower.includes('cannot be reached')) {
    return 'Connection Failure: Unable to synchronize changes with Firebase. Please check your internet connectivity.';
  }

  return rawMessage;
}

/**
 * Required standard handler as defined in security rules skills
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
