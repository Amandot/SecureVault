import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter, useSegments } from 'expo-router';
import { api } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Pre-fetch token to ensure api calls work immediately
        await currentUser.getIdToken();
      }

      if (isInitializing) setIsInitializing(false);
    });

    return unsubscribe;
  }, [isInitializing]);

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to home
      router.replace('/(tabs)');
    }
  }, [user, isInitializing, segments]);

  return { user, isInitializing };
}
