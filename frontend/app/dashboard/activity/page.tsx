'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../../../lib/api';
import {
  Upload,
  Eye,
  Download,
  Share2,
  Trash2,
  LogIn,
  LogOut,
  AlertTriangle,
  Clock,
  RotateCcw,
  Edit2,
} from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  file?: { id: string; filename: string } | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const actionConfig: Record<string, { icon: typeof Upload; color: string; label: string }> = {
  upload: { icon: Upload, color: 'var(--accent)', label: 'Uploaded' },
  view: { icon: Eye, color: 'var(--green)', label: 'Viewed' },
  download: { icon: Download, color: 'var(--purple)', label: 'Downloaded' },
  share: { icon: Share2, color: 'var(--warning)', label: 'Shared' },
  delete: { icon: Trash2, color: 'var(--danger)', label: 'Deleted' },
  rename: { icon: Edit2, color: 'var(--accent)', label: 'Renamed' },
  login: { icon: LogIn, color: 'var(--green)', label: 'Logged in' },
  logout: { icon: LogOut, color: 'var(--text-muted)', label: 'Logged out' },
  revoke: { icon: RotateCcw, color: 'var(--danger)', label: 'Revoked share' },
  failed_access: { icon: AlertTriangle, color: 'var(--danger)', label: 'Failed access' },
  expired_link: { icon: Clock, color: 'var(--warning)', label: 'Expired link' },
};

function groupByDate(activities: Activity[]) {
  const groups: Record<string, Activity[]> = {};
  activities.forEach((a) => {
    const dateKey = new Date(a.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(a);
  });
  return groups;
}

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityApi.list({ limit: 50 }).then((r) => r.data),
  });

  const activities: Activity[] = data?.activities || [];
  const grouped = groupByDate(activities);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Activity Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Full audit trail of all actions on your account
        </p>
      </motion.div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}
        >
          <Clock size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No activity yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Your actions will appear here as you use SecureVault
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {Object.entries(grouped).map(([date, acts], groupIdx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.05 }}
            >
              {/* Date header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {date}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* Activity items */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                {acts.map((act, i) => {
                  const config = actionConfig[act.action] || {
                    icon: Clock,
                    color: 'var(--text-muted)',
                    label: act.action,
                  };
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 16,
                        padding: '16px 20px',
                        borderBottom: i < acts.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: `${config.color}15`,
                          border: `1px solid ${config.color}25`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} color={config.color} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                          <span style={{ color: config.color, fontWeight: 600 }}>
                            {config.label}
                          </span>
                          {act.file && (
                            <>
                              {' '}
                              <span style={{ color: 'var(--text-primary)' }}>
                                {act.file.filename}
                              </span>
                            </>
                          )}
                          {act.metadata?.from != null && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                              {' '}
                              — &quot;{String(act.metadata.from)}&quot; → &quot;{String(act.metadata.to)}&quot;
                            </span>
                          )}
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {new Date(act.createdAt).toLocaleTimeString()}
                          </span>
                          {act.ipAddress && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              IP: {act.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata badge */}
                      {act.action === 'failed_access' && (
                        <span className="badge badge-danger" style={{ fontSize: 10 }}>
                          Security Alert
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
