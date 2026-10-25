'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import NotificationDrawer from './NotificationDrawer';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../lib/api';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data).catch(() => null),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  return (
    <div className="dashboard-container">
      {/* ─── Single Primary Navigation Sidebar ─────────────────────────────── */}
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Mobile Backdrop for Sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 43, 58, 0.35)',
            backdropFilter: 'blur(4px)',
            zIndex: 34,
          }}
        />
      )}

      {/* ─── Main Content Column ────────────────────────────────────────────── */}
      <div className="dashboard-main-column">
        {/* Floating Top Navbar */}
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />

        {/* Page Content */}
        <main className="dashboard-main-content">
          {children}
        </main>
      </div>

      {/* ─── Level 3: Right Slide-Over Notification Drawer ───────────────────── */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
