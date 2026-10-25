'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Upload,
  ChevronDown,
  Menu,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../lib/api';
import Image from 'next/image';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  onOpenNotifications?: () => void;
}

export default function Navbar({
  onToggleMobileSidebar,
  onOpenNotifications,
}: NavbarProps) {
  const { appUser, logOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Poll notifications count
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data).catch(() => null),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/my-files?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Keyboard shortcut ⌘K or Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  return (
    <header className="navbar-floating-header">
      {/* ─── Left: Mobile Menu & Flexible Global Search ───────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="mobile-menu-btn"
          title="Toggle Navigation"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: 12,
            width: 38,
            height: 38,
            display: 'none', // Shown on mobile via CSS
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#182B3A',
            flexShrink: 0,
          }}
        >
          <Menu size={20} />
        </button>

        {/* Global Pill Search Bar */}
        <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            color="#8FA3B3"
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search encrypted files, folders, or people..."
            style={{
              width: '100%',
              height: 42,
              paddingLeft: 42,
              paddingRight: 64,
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 500,
              color: '#182B3A',
              outline: 'none',
              boxShadow: 'inset 0 1px 3px rgba(35, 94, 138, 0.04)',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = '#FFFFFF';
              e.target.style.borderColor = '#1683F8';
              e.target.style.boxShadow = '0 0 0 3px rgba(22, 131, 248, 0.16)';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.75)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.85)';
              e.target.style.boxShadow = 'inset 0 1px 3px rgba(35, 94, 138, 0.04)';
            }}
          />
          {/* Keyboard shortcut hint */}
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(240, 246, 252, 0.9)',
              border: '1px solid rgba(22, 131, 248, 0.18)',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 600,
              color: '#718493',
              pointerEvents: 'none',
            }}
          >
            ⌘K
          </div>
        </form>
      </div>

      {/* ─── Right: Actions & User Capsule ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Upload Button */}
        <Link href="/dashboard/upload" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary"
            style={{
              height: 40,
              padding: '0 16px',
              fontSize: 13,
              borderRadius: 14,
            }}
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Upload</span>
          </motion.button>
        </Link>

        {/* Notifications Icon Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenNotifications}
          title="Notifications"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: unreadCount > 0 ? '#1683F8' : '#718493',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(35, 94, 138, 0.04)',
          }}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#F04444',
                border: '2px solid #FFFFFF',
                boxShadow: '0 0 6px rgba(240, 68, 68, 0.7)',
              }}
            />
          )}
        </motion.button>

        {/* ─── User Profile Capsule with Dropdown (Matching Reference Screenshot) ── */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setUserMenuOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 12px 5px 6px',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: 999,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(35, 94, 138, 0.04)',
              textAlign: 'left',
            }}
          >
            {/* Avatar */}
            {appUser?.photo ? (
              <Image
                src={appUser.photo}
                alt={appUser.name || 'User'}
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1683F8, #0866D9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {appUser?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            {/* User Title & Name */}
            <div className="hidden md:flex" style={{ flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  color: '#8FA3B3',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                }}
              >
                SecureVault Pro
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#182B3A',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {appUser?.name || 'Authorized User'}
              </span>
            </div>

            <ChevronDown size={14} color="#8FA3B3" />
          </motion.button>

          {/* User Profile Dropdown Menu */}
          <AnimatePresence>
            {userMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: 'absolute',
                    top: 50,
                    right: 0,
                    width: 220,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    borderRadius: 18,
                    boxShadow: '0 12px 36px rgba(35, 94, 138, 0.14)',
                    padding: '8px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(22, 131, 248, 0.1)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                      {appUser?.name || 'User'}
                    </p>
                    <p style={{ fontSize: 11, color: '#718493', margin: '2px 0 0', wordBreak: 'break-all' }}>
                      {appUser?.email}
                    </p>
                  </div>

                  <Link
                    href="/dashboard/security"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#182B3A',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(22, 131, 248, 0.08)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <ShieldCheck size={16} color="#1683F8" />
                    <span>Security Center</span>
                  </Link>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#182B3A',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(22, 131, 248, 0.08)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <Settings size={16} color="#718493" />
                    <span>Settings</span>
                  </Link>

                  <div style={{ height: 1, background: 'rgba(22, 131, 248, 0.08)', margin: '4px 0' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#F04444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(240, 68, 68, 0.08)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <LogOut size={16} color="#F04444" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
