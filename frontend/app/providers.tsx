'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../lib/auth/AuthContext';
import { useState, useEffect, ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  // Clear legacy dark theme from previous session so sky blue glassmorphism takes effect immediately
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('theme') === 'dark') {
          localStorage.setItem('theme', 'light');
        }
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={['light', 'dark']}
      >
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
