import type { Metadata } from 'next';
import AuthGuard from '../../components/auth/AuthGuard';
import DashboardShell from '../../components/layout/DashboardShell';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | SecureVault Encrypted Cloud',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
