'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  Users,
  Send,
  Inbox,
  Star,
  Trash2,
  Activity,
  ShieldCheck,
  KeyRound,
  Settings,
  HelpCircle,
  X,
  LogOut,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { accessRequestsApi } from '../../lib/api';
import BrandLogo from '../icons/BrandLogo';
import { useAuth } from '../../lib/auth/AuthContext';
import Image from 'next/image';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobileOpen?: boolean;
}

export default function Sidebar({ onCloseMobile, isMobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const router = useRouter();
  const { appUser, logOut } = useAuth();
  const [hasLocalKey, setHasLocalKey] = useState<boolean | null>(null);

  // Check verified local key status on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sv_private_key');
      setHasLocalKey(!!stored);
    }
  }, []);

  // Fetch count of pending requests for the badge
  const { data: requestsData } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => accessRequestsApi.list().then((r) => r.data).catch(() => null),
  });

  const pendingRequestsCount =
    requestsData?.incoming?.filter((r: any) => r.status === 'pending').length || 0;

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const isSharedWithMeActive = pathname === '/dashboard/shared' && (!currentTab || currentTab === 'with-me');
  const isSharedByMeActive = pathname === '/dashboard/shared' && currentTab === 'by-me';
  const isEncryptionKeysActive = (pathname === '/dashboard/settings' && currentTab === 'keys') || pathname === '/dashboard/security';

  return (
    <aside
      id="primary-sidebar"
      className={`desktop-primary-sidebar ${isMobileOpen ? 'mobile-sidebar-open' : ''}`}
      style={{
        width: 270,
        height: 'calc(100vh - 32px)',
        margin: '16px 0 16px 16px',
        position: 'sticky',
        top: 16,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.75)',
        boxShadow: '0 8px 32px rgba(35, 94, 138, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 14px 14px',
        zIndex: 35,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* ─── Sidebar Header: Brand Logo & Title ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px 14px',
          marginBottom: 8,
          borderBottom: '1px solid rgba(22, 131, 248, 0.12)',
          flexShrink: 0,
        }}
      >
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <BrandLogo size={32} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#182B3A', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
              Secure<span style={{ color: '#1683F8' }}>Vault</span>
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#24BD70', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              E2EE Protected
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="mobile-close-btn"
          title="Close Navigation"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: 8,
            color: '#718493',
            cursor: 'pointer',
            padding: 6,
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ─── Scrollable Navigation Body ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* ─── SECTION: MAIN ─── */}
        <div>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '1.2px',
              color: '#8FA3B3',
              textTransform: 'uppercase',
              padding: '2px 10px 6px',
              margin: 0,
            }}
          >
            Main
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === '/dashboard'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/my-files"
              icon={Files}
              label="My Files"
              active={pathname === '/dashboard/my-files'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/shared?tab=with-me"
              icon={Users}
              label="Shared with Me"
              active={isSharedWithMeActive}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/shared?tab=by-me"
              icon={Send}
              label="Shared by Me"
              active={isSharedByMeActive}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/requests"
              icon={Inbox}
              label="File Requests"
              active={pathname === '/dashboard/requests'}
              badge={pendingRequestsCount > 0 ? pendingRequestsCount : undefined}
              badgeColor="#F04444"
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/favorites"
              icon={Star}
              label="Starred"
              active={pathname === '/dashboard/favorites'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/trash"
              icon={Trash2}
              label="Trash"
              active={pathname === '/dashboard/trash'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/activity"
              icon={Activity}
              label="Activity"
              active={pathname === '/dashboard/activity'}
              onClick={onCloseMobile}
            />
          </div>
        </div>

        {/* ─── SECTION: SECURITY ─── */}
        <div>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '1.2px',
              color: '#8FA3B3',
              textTransform: 'uppercase',
              padding: '2px 10px 6px',
              margin: 0,
            }}
          >
            Security
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavItem
              href="/dashboard/security"
              icon={ShieldCheck}
              label="Security Center"
              active={pathname === '/dashboard/security'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/settings?tab=keys"
              icon={KeyRound}
              label="Encryption & Keys"
              active={pathname === '/dashboard/settings' && currentTab === 'keys'}
              onClick={onCloseMobile}
            />
          </div>
        </div>

        {/* ─── SECTION: PREFERENCES ─── */}
        <div>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '1.2px',
              color: '#8FA3B3',
              textTransform: 'uppercase',
              padding: '2px 10px 6px',
              margin: 0,
            }}
          >
            Preferences
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavItem
              href="/dashboard/settings"
              icon={Settings}
              label="Settings"
              active={pathname === '/dashboard/settings' && currentTab !== 'keys'}
              onClick={onCloseMobile}
            />
            <NavItem
              href="/dashboard/security"
              icon={HelpCircle}
              label="Help & Guidance"
              active={false}
              onClick={onCloseMobile}
            />
          </div>
        </div>
      </div>

      {/* ─── Sidebar Footer: Compact Verified Security Status Card ─────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 10, flexShrink: 0 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(235, 245, 255, 0.95), rgba(225, 242, 254, 0.85))',
            border: '1px solid rgba(22, 131, 248, 0.22)',
            borderRadius: 14,
            padding: '10px 12px',
            marginBottom: 10,
            boxShadow: '0 2px 10px rgba(22, 131, 248, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="#1683F8" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#182B3A' }}>
                Vault Cryptography
              </span>
            </div>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: hasLocalKey === false ? '#E07706' : '#24BD70',
                background: hasLocalKey === false ? 'rgba(224, 119, 6, 0.12)' : 'rgba(36, 189, 112, 0.12)',
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {hasLocalKey === false ? 'Needs Key' : 'Verified'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#4A6277' }}>
              <CheckCircle2 size={12} color="#1683F8" />
              <span>AES-256-GCM Hardware</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#4A6277' }}>
              {hasLocalKey === false ? (
                <AlertTriangle size={12} color="#E07706" />
              ) : (
                <CheckCircle2 size={12} color="#24BD70" />
              )}
              <span>{hasLocalKey === false ? 'Key Pair: Setup Required' : 'RSA-4096 Keys: Active'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#718493' }}>
              <span style={{ fontSize: 10, color: '#0866D9', fontWeight: 600 }}>Zero-Knowledge:</span>
              <span style={{ fontSize: 10 }}>Server sees 0 plaintexts</span>
            </div>
          </div>
        </div>

        {/* User Capsule & Logout */}
        <div
          style={{
            paddingTop: 8,
            borderTop: '1px solid rgba(22, 131, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {appUser?.photo ? (
              <Image
                src={appUser.photo}
                alt={appUser.name || 'User'}
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1683F8, #0866D9)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {appUser?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#182B3A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {appUser?.name || 'Vault User'}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: '#718493',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {appUser?.email || 'Protected Session'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'rgba(240, 68, 68, 0.08)',
              border: '1px solid rgba(240, 68, 68, 0.18)',
              color: '#F04444',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(240, 68, 68, 0.16)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(240, 68, 68, 0.08)';
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  badgeColor = '#1683F8',
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  badge?: number | string;
  badgeColor?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 11px',
        borderRadius: 12,
        background: active ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        border: active ? '1px solid rgba(22, 131, 248, 0.28)' : '1px solid transparent',
        boxShadow: active ? '0 4px 14px rgba(22, 131, 248, 0.1)' : 'none',
        color: active ? '#0866D9' : '#182B3A',
        fontWeight: active ? 700 : 500,
        fontSize: 13.5,
        textDecoration: 'none',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.65)';
          (e.currentTarget as HTMLElement).style.color = '#0866D9';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = '#182B3A';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      </div>

      {badge !== undefined && (
        <span
          style={{
            background: badgeColor,
            color: '#FFFFFF',
            fontSize: 10.5,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 999,
            minWidth: 18,
            textAlign: 'center',
            boxShadow: `0 2px 6px ${badgeColor}40`,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
