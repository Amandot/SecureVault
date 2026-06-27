import React from 'react';

interface PermissionGuardProps {
  canDownload: boolean;
  blocked: boolean;
  children: React.ReactNode;
}

export default function PermissionGuard({ canDownload, blocked, children }: PermissionGuardProps) {
  if (blocked && !canDownload) {
    return null;
  }
  return <>{children}</>;
}
