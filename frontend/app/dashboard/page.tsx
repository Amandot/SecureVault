'use client';

import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { filesApi, activityApi } from '../../lib/api';
import {
  Files,
  Share2,
  HardDrive,
  Shield,
  Clock,
  Upload,
  Eye,
  Download,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { fadeUp } from '@/lib/motion';

const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload size={14} color="var(--accent)" />,
  view: <Eye size={14} color="var(--green)" />,
  download: <Download size={14} color="var(--purple)" />,
  share: <Share2 size={14} color="var(--warning)" />,
  delete: <Trash2 size={14} color="var(--danger)" />,
};

const actionColors: Record<string, string> = {
  upload: 'var(--accent)',
  view: 'var(--green)',
  download: 'var(--purple)',
  share: 'var(--warning)',
  delete: 'var(--danger)',
};

export default function DashboardHome() {
  const { appUser } = useAuth();

  const { data: filesData } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.list().then((r) => r.data),
  });

  const { data: activityData } = useQuery({
    queryKey: ['activity', { limit: 8 }],
    queryFn: () => activityApi.list({ limit: 8 }).then((r) => r.data),
  });

  const files = filesData?.files || [];
  const activities = activityData?.activities || [];

  // Calculate stats
  const totalSize = files.reduce(
    (acc: number, f: { size: string }) => acc + parseInt(f.size || '0'),
    0
  );
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const stats = [
    {
      icon: Files,
      label: 'Total Files',
      value: files.length,
      sub: 'encrypted',
      color: 'var(--accent)',
    },
    {
      icon: HardDrive,
      label: 'Storage Used',
      value: formatSize(totalSize),
      sub: 'encrypted on cloud',
      color: 'var(--green)',
    },
    {
      icon: Share2,
      label: 'Shared Files',
      value: files.filter((f: { _count?: { shares: number } }) => (f._count?.shares || 0) > 0).length,
      sub: 'active shares',
      color: 'var(--purple)',
    },
    {
      icon: Shield,
      label: 'Encryption',
      value: '100%',
      sub: 'E2E encrypted',
      color: 'var(--warning)',
    },
  ];

  const recentFiles = files.slice(0, 5);

  return (
    <div>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 32 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Welcome back, {appUser?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Your encrypted vault is secure. Here&apos;s what&apos;s happening.
        </p>
      </motion.div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              custom={i + 1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -3, scale: 1.01 }}
              className="glass-card"
              style={{ padding: 24 }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: `${stat.color}18`,
                    border: `1px solid ${stat.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={stat.color} />
                </div>
                <TrendingUp size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Two-Column: Recent Files + Activity ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Files */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-card"
          style={{ padding: 24 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Files</h2>
            <Link
              href="/dashboard/my-files"
              style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {recentFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Files size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No files yet</p>
              <Link href="/dashboard/upload" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex', padding: '8px 18px', fontSize: 13 }}>
                Upload your first file
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentFiles.map((file: { id: string; filename: string; mimeType: string; size: string; encryptionType: string; createdAt: string }, i: number) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,200,255,0.04)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                  }
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--card-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {file.mimeType?.includes('pdf')
                      ? '📄'
                      : file.mimeType?.includes('image')
                      ? '🖼️'
                      : file.mimeType?.includes('video')
                      ? '🎥'
                      : '📁'}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      className="truncate"
                      style={{ fontSize: 13, fontWeight: 500 }}
                    >
                      {file.filename}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatSize(parseInt(file.size || '0'))} •{' '}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="badge badge-accent" style={{ fontSize: 10 }}>
                    🔐
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-card"
          style={{ padding: 24 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h2>
            <Link
              href="/dashboard/activity"
              style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map(
                (
                  act: { id: string; action: string; file?: { filename: string } | null; createdAt: string },
                  i: number
                ) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      paddingBottom: i < activities.length - 1 ? 16 : 0,
                      marginBottom: i < activities.length - 1 ? 16 : 0,
                      borderBottom:
                        i < activities.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: `${actionColors[act.action] || 'var(--text-muted)'}15`,
                        border: `1px solid ${actionColors[act.action] || 'var(--text-muted)'}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {actionIcons[act.action] || <Clock size={12} color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: actionColors[act.action] || 'var(--text-secondary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {act.action}
                        </span>
                        {act.file && (
                          <>
                            {' '}
                            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                              {act.file.filename}
                            </span>
                          </>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(act.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
