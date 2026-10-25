'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCheck,
  Bell,
  ShieldAlert,
  Share2,
  Upload,
  Download,
  KeyRound,
  FileText,
  Clock,
  Inbox,
  Check,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../lib/api';
import Link from 'next/link';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'unread' | 'security';

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readSingleMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const rawNotifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const filteredNotifications = rawNotifications.filter((n: any) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'security') {
      return (
        n.type === 'revoke' ||
        n.type === 'expire' ||
        n.type === 'request' ||
        n.message?.toLowerCase().includes('security') ||
        n.message?.toLowerCase().includes('key')
      );
    }
    return true;
  });

  const getCategoryIcon = (type: string, message: string) => {
    const msg = message?.toLowerCase() || '';
    if (type === 'share' || msg.includes('shared')) {
      return <Share2 size={16} color="#1683F8" />;
    }
    if (type === 'upload' || msg.includes('uploaded')) {
      return <Upload size={16} color="#24BD70" />;
    }
    if (type === 'download' || msg.includes('downloaded')) {
      return <Download size={16} color="#8B5CF6" />;
    }
    if (type === 'request' || msg.includes('request')) {
      return <Inbox size={16} color="#F4AB36" />;
    }
    if (type === 'revoke' || type === 'expire' || msg.includes('security')) {
      return <ShieldAlert size={16} color="#F04444" />;
    }
    return <Bell size={16} color="#1683F8" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffMs = now - past;
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Translucent Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(24, 43, 58, 0.25)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 90,
            }}
          />

          {/* Frosted Light-Blue Glass Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            aria-label="Notification Drawer"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 420,
              height: '100vh',
              background: 'rgba(245, 251, 255, 0.88)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '-12px 0 45px rgba(24, 76, 120, 0.14)',
              zIndex: 95,
              display: 'flex',
              flexDirection: 'column',
              borderTopLeftRadius: 28,
              borderBottomLeftRadius: 28,
              overflow: 'hidden',
            }}
          >
            {/* ─── Drawer Header ──────────────────────────────────────────── */}
            <div
              style={{
                padding: '24px 24px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', margin: 0 }}>
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: '#1683F8',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      boxShadow: '0 2px 8px rgba(22, 131, 248, 0.3)',
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => readAllMutation.mutate()}
                    title="Mark all as read"
                    disabled={readAllMutation.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(22, 131, 248, 0.1)',
                      color: '#0866D9',
                      border: '1px solid rgba(22, 131, 248, 0.25)',
                      borderRadius: 8,
                      padding: '5px 9px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCheck size={14} />
                    <span>Mark all</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  title="Close"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    borderRadius: 10,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#718493',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ─── Filter Tabs ────────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '12px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              {(['all', 'unread', 'security'] as FilterTab[]).map((tab) => {
                const isActive = filter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      border: isActive
                        ? '1px solid rgba(22, 131, 248, 0.3)'
                        : '1px solid transparent',
                      background: isActive ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                      color: isActive ? '#0866D9' : '#5E7385',
                      boxShadow: isActive ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.16s ease',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ─── Notification Items List ─────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 80, borderRadius: 16 }}
                    />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#8FA3B3',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(22, 131, 248, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      color: '#1683F8',
                    }}
                  >
                    <Bell size={24} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#182B3A', marginBottom: 4 }}>
                    No {filter !== 'all' ? filter : ''} notifications
                  </h4>
                  <p style={{ fontSize: 13, color: '#718493' }}>
                    You are completely up to date. Security and file events will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredNotifications.map((n: any) => {
                    const isUnread = !n.isRead;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 16,
                          background: isUnread
                            ? 'rgba(255, 255, 255, 0.95)'
                            : 'rgba(255, 255, 255, 0.55)',
                          border: isUnread
                            ? '1px solid rgba(22, 131, 248, 0.28)'
                            : '1px solid rgba(255, 255, 255, 0.7)',
                          boxShadow: isUnread
                            ? '0 4px 16px rgba(22, 131, 248, 0.08)'
                            : '0 2px 8px rgba(35, 94, 138, 0.03)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          position: 'relative',
                        }}
                      >
                        {/* Icon circle */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: 'rgba(22, 131, 248, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {getCategoryIcon(n.type, n.message)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: isUnread ? 700 : 500,
                              color: '#182B3A',
                              lineHeight: 1.45,
                              marginBottom: 4,
                            }}
                          >
                            {n.message}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              fontSize: 11,
                              color: '#8FA3B3',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} />
                              {formatRelativeTime(n.createdAt)}
                            </span>
                            {isUnread && (
                              <button
                                onClick={() => readSingleMutation.mutate(n.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0866D9',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: 0,
                                }}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Unread dot */}
                        {isUnread && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#1683F8',
                              boxShadow: '0 0 8px rgba(22, 131, 248, 0.6)',
                              flexShrink: 0,
                              marginTop: 6,
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Drawer Footer ──────────────────────────────────────────── */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Link
                href="/dashboard/activity"
                onClick={onClose}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0866D9',
                  textDecoration: 'none',
                }}
              >
                View full activity audit log →
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
