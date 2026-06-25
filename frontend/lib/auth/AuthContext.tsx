'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { authApi } from '../api';
import { clearPrivateKey } from '../crypto/keyManager';

export interface AppUser {
  id: string;
  firebaseUID: string;
  name: string;
  email: string;
  photo?: string | null;
  publicKey?: string | null;
}

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch our backend user record after Firebase auth
  const fetchAppUser = async () => {
    try {
      const { data } = await authApi.me();
      setAppUser(data.user);
    } catch {
      setAppUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchAppUser();
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    await fetchAppUser();
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    // Register in our DB
    await authApi.register({ name });
    await fetchAppUser();
  };

  const signInGoogle = async () => {
    const { user } = await signInWithPopup(auth, googleProvider);
    await authApi.register({
      name: user.displayName || user.email?.split('@')[0] || 'User',
    });
    await fetchAppUser();
  };

  const logOut = async () => {
    clearPrivateKey(); // Clear locally stored private key on logout
    await signOut(auth);
    setAppUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshAppUser = async () => {
    await fetchAppUser();
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        signIn,
        signUp,
        signInGoogle,
        logOut,
        resetPassword,
        refreshAppUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
