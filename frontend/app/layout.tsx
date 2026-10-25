import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    default: 'SecureVault – End-to-End Encrypted Cloud Storage',
    template: '%s | SecureVault',
  },
  description:
    'Military-grade end-to-end encrypted document management. Upload, encrypt, and share files with complete privacy. Server never sees your plaintext.',
  keywords: [
    'encrypted cloud storage',
    'end-to-end encryption',
    'secure file sharing',
    'privacy',
    'AES-256',
    'document management',
  ],
  authors: [{ name: 'SecureVault' }],
  creator: 'SecureVault',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'SecureVault – End-to-End Encrypted Cloud Storage',
    description:
      'Military-grade E2E encrypted document management with owner-controlled permissions.',
    siteName: 'SecureVault',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#CBEAFC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="light" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster 
          theme="light" 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.75)',
              color: '#182B3A',
              boxShadow: '0 8px 32px rgba(35, 94, 138, 0.12)',
              borderRadius: '16px',
            }
          }}
        />
      </body>
    </html>
  );
}
