'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  Share2,
  Clock,
  Star,
  Trash2,
  Activity,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Upload,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/upload', icon: Upload, label: 'Upload File' },
  { href: '/dashboard/my-files', icon: Files, label: 'My Files' },
  { href: '/dashboard/shared', icon: Share2, label: 'Shared With Me' },
  { href: '/dashboard/recent', icon: Clock, label: 'Recent' },
  { href: '/dashboard/favorites', icon: Star, label: 'Favorites' },
  { href: '/dashboard/trash', icon: Trash2, label: 'Trash' },
  { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
  { href: '/dashboard/requests', icon: Inbox, label: 'Requests' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, logOut } = useAuth();

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--secondary-bg)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ─── Logo ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={17} color="#000" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Secure<span style={{ color: 'var(--accent)' }}>Vault</span>
          </span>
        </motion.div>

        {collapsed && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={17} color="#000" />
          </div>
        )}

        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            flexShrink: 0,
            position: collapsed ? 'absolute' : 'relative',
            right: collapsed ? -10 : 'auto',
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* ─── Navigation ──────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.5px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                padding: '8px 12px 4px',
              }}
            >
              Navigation
            </motion.p>
          )}
        </AnimatePresence>

        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px' : '10px 12px',
                  marginBottom: 2,
                }}
              >
                <Icon size={18} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* ─── User Profile ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: collapsed ? '12px 10px' : '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {appUser?.photo ? (
          <Image
            src={appUser.photo}
            alt={appUser.name}
            width={32}
            height={32}
            style={{ borderRadius: '50%', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#000',
              flexShrink: 0,
            }}
          >
            {appUser?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              style={{ flex: 1, overflow: 'hidden' }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {appUser?.name || 'User'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {appUser?.email}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          id="logout-btn"
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            padding: 4,
            borderRadius: 6,
            transition: 'color 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = 'var(--danger)')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = 'var(--text-muted)')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
