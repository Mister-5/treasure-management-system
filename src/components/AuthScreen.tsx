/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  auth, 
  db, 
  firebaseAvailable,
  sanitizeFirestoreData
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Church, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UserRole, UserStatus, UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  darkMode: boolean;
}

export default function AuthScreen({ onAuthSuccess, darkMode }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSyncUserProfile = async (firebaseUser: any, nameStr: string) => {
    if (!firebaseAvailable || !db) return null;
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    let userProfile: UserProfile;

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        userProfile = snap.data() as UserProfile;
      } else {
        // Enforce defaults in accordance with the Security Rules matching
        userProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: nameStr || firebaseUser.displayName || 'Treasury User',
          role: UserRole.TREASURER, // Required by rules line 69 for new registrations
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, sanitizeFirestoreData(userProfile));
      }
      return userProfile;
    } catch (err: any) {
      console.error("Error checking/creating user profile in Firestore:", err);
      // Fallback local profile if write fails or permission is denied
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: nameStr || firebaseUser.displayName || 'Local Treasurer',
        role: UserRole.TREASURER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString()
      };
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const profile = await handleSyncUserProfile(result.user, result.user.displayName || '');
      if (profile) {
        onAuthSuccess(profile);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate via Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide all credentials.');
      return;
    }
    if (isSignUp && !displayName) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Create auth user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        const profile = await handleSyncUserProfile(result.user, displayName);
        if (profile) {
          onAuthSuccess(profile);
        }
      } else {
        // Sign in auth user
        const result = await signInWithEmailAndPassword(auth, email, password);
        const profile = await handleSyncUserProfile(result.user, result.user.displayName || '');
        if (profile) {
          onAuthSuccess(profile);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 flex flex-col justify-between">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden bg-white border border-slate-250 dark:border-slate-800 shadow-md mb-3 p-1 flex items-center justify-center">
            <img 
              src="https://i.ibb.co/sJyvLb1D/GBU.jpg" 
              alt="GBU Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Treasury Management System
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Secure financial portal & real-time Rwandan Franc ledger
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-450 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* Primary Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="treasurer@church.rw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Divider separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
            <span className="px-3 bg-white dark:bg-slate-900 text-slate-400">Or Continue With</span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 py-2.5 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
        >
          <svg className="w-4 h-4 mr-1 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google Workspace Account
        </button>

        {/* Footer Toggle Text */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-[11.5px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            {isSignUp ? 'Already registered? Sign In instead' : 'New User? Create a Treasurer account'}
          </button>
        </div>

        {/* Help Note on Rules Restriction */}
        {isSignUp && (
          <p className="text-[9px] text-slate-400 text-center mt-4 leading-relaxed font-semibold">
            Note: As per security guidelines, newly registered email accounts are restricted to the <strong className="text-slate-500">Treasurer</strong> role simulation and automatically verified for sandbox database access.
          </p>
        )}
      </div>
    </div>
  );
}
