import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

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
  themeColor: '#07111F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
