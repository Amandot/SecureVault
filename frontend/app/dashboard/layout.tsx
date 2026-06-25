import type { Metadata } from 'next';
import AuthGuard from '../../components/auth/AuthGuard';
import Sidebar from '../../components/layout/Sidebar';
import Navbar from '../../components/layout/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | SecureVault Dashboard',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--primary-bg)' }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            marginLeft: 260,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            transition: 'margin-left 0.3s ease',
          }}
        >
          <Navbar />
          <main
            style={{
              flex: 1,
              marginTop: 64,
              padding: '32px',
              maxWidth: '100%',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
