'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Upload, X, Check, Menu } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../lib/api';
import { useEffect } from 'react';

const notificationIcons: Record<string, string> = {
  view: '👁️',
  download: '⬇️',
  share: '🔗',
  request: '📨',
  revoke: '🚫',
  expire: '⏰',
};

export default function Navbar() {
  const { appUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30000, // poll every 30s
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/my-files?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    const handleToggle = () => {
      document.getElementById('mobile-sidebar')?.classList.toggle('mobile-sidebar-open');
      document.getElementById('mobile-sidebar')?.classList.toggle('mobile-sidebar-closed');
    };
    
    document.getElementById('mobile-menu-btn')?.addEventListener('click', handleToggle);
    return () => document.getElementById('mobile-menu-btn')?.removeEventListener('click', handleToggle);
  }, []);

  return (
    <header
      className="navbar-header"
      style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        height: 64,
        background: 'rgba(7, 17, 31, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 28px)',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <button
          id="mobile-menu-btn"
          className="mobile-only-btn"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'none', // Hidden by default, shown via CSS media query
            padding: 4,
          }}
        >
          <Menu size={24} />
        </button>
        {/* ─── Search ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 480 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            id="navbar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name, type, or owner..."
            className="input-field"
            style={{
              paddingLeft: 42,
              paddingRight: 16,
              height: 40,
              fontSize: 14,
            }}
          />
        </div>
      </form>
      </div>

      {/* ─── Right Actions ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Upload Button */}
        <Link href="/dashboard/upload">
          <motion.button
            id="navbar-upload-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            <Upload size={15} />
            Upload
          </motion.button>
        </Link>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <motion.button
            id="notifications-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications((s) => !s)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              color: 'var(--text-secondary)',
            }}
          >
            <Bell size={17} />
            {notifData?.unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
                }}
              />
            )}
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 45 }}
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card"
                  style={{
                    position: 'absolute',
                    top: 48,
                    right: 0,
                    width: 380,
                    maxHeight: 480,
                    zIndex: 50,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {notifData?.unreadCount > 0 && (
                        <button
                          onClick={() => readAllMutation.mutate()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Check size={12} /> Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifData?.notifications?.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifData?.notifications?.map(
                        (n: { id: string; type: string; message: string; isRead: boolean; createdAt: string }) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '14px 20px',
                              borderBottom: '1px solid var(--border)',
                              display: 'flex',
                              gap: 12,
                              background: n.isRead ? 'transparent' : 'rgba(0,200,255,0.03)',
                              cursor: 'default',
                            }}
                          >
                            <span style={{ fontSize: 20 }}>
                              {notificationIcons[n.type] || '🔔'}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                {n.message}
                              </p>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {!n.isRead && (
                              <div
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: 'var(--accent)',
                                  flexShrink: 0,
                                  marginTop: 5,
                                }}
                              />
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <Link href="/dashboard/settings">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#000',
              cursor: 'pointer',
              border: '2px solid var(--border)',
            }}
          >
            {appUser?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </Link>
      </div>
    </header>
  );
}
