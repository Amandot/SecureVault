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
          className="dashboard-main"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          <Navbar />
          <main
            style={{
              flex: 1,
              padding: 'clamp(16px, 4vw, 32px)',
              maxWidth: '100%',
              overflowX: 'hidden'
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
