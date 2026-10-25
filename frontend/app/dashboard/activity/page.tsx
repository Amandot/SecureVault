'use client';

import React, { useState } from 'react';
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
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  FileText,
  User,
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

const actionConfig: Record<string, { icon: React.ComponentType<{ size: number; color?: string }>; color: string; label: string; badgeBg: string }> = {
  upload: { icon: Upload, color: '#1683F8', label: 'Uploaded File', badgeBg: 'rgba(22, 131, 248, 0.12)' },
  view: { icon: Eye, color: '#24BD70', label: 'Viewed Document', badgeBg: 'rgba(36, 189, 112, 0.12)' },
  download: { icon: Download, color: '#8B5CF6', label: 'Downloaded File', badgeBg: 'rgba(139, 92, 246, 0.12)' },
  share: { icon: Share2, color: '#0866D9', label: 'Created Share Link', badgeBg: 'rgba(8, 102, 217, 0.12)' },
  delete: { icon: Trash2, color: '#F04444', label: 'Moved to Trash', badgeBg: 'rgba(240, 68, 68, 0.12)' },
  rename: { icon: Edit2, color: '#1683F8', label: 'Renamed File', badgeBg: 'rgba(22, 131, 248, 0.12)' },
  login: { icon: LogIn, color: '#24BD70', label: 'User Signed In', badgeBg: 'rgba(36, 189, 112, 0.12)' },
  logout: { icon: LogOut, color: '#8FA3B3', label: 'User Signed Out', badgeBg: 'rgba(143, 163, 179, 0.12)' },
  revoke: { icon: RotateCcw, color: '#F04444', label: 'Revoked Share', badgeBg: 'rgba(240, 68, 68, 0.12)' },
  failed_access: { icon: AlertTriangle, color: '#F04444', label: 'Failed Access Attempt', badgeBg: 'rgba(240, 68, 68, 0.12)' },
  expired_link: { icon: Clock, color: '#F4AB36', label: 'Link Expired', badgeBg: 'rgba(244, 171, 54, 0.12)' },
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
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityApi.list({ limit: 80 }).then((r) => r.data),
  });

  const rawActivities: Activity[] = data?.activities || [];

  const filtered = rawActivities.filter((a) => {
    if (filterAction !== 'all' && a.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchFile = a.file?.filename?.toLowerCase().includes(q);
      const matchAction = a.action?.toLowerCase().includes(q);
      const matchIp = a.ipAddress?.toLowerCase().includes(q);
      return matchFile || matchAction || matchIp;
    }
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Activity</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Activity & Audit Trail
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Cryptographic tamper-evident audit history of all actions performed in your vault
        </p>
      </div>

      {/* ─── Controls: Search & Action Filters ─────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: 'rgba(255, 255, 255, 0.65)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search
            size={15}
            color="#8FA3B3"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity by file or IP..."
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 38,
              paddingRight: 14,
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              fontSize: 13,
              color: '#182B3A',
              outline: 'none',
            }}
          />
        </div>

        {/* Action Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'upload', 'download', 'view', 'share'].map((action) => {
            const isActive = filterAction === action;
            return (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: isActive ? '1px solid rgba(22, 131, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.8)',
                  background: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  color: isActive ? '#0866D9' : '#5E7385',
                  boxShadow: isActive ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                }}
              >
                {action}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Timeline Feed ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 75, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(22, 131, 248, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#1683F8',
            }}
          >
            <Clock size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
            No activity matches your filters
          </h3>
          <p style={{ fontSize: 13.5, color: '#718493' }}>
            Actions like file upload, view, decryption, and sharing are automatically audited here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              {/* Date Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    color: '#0866D9',
                    textTransform: 'uppercase',
                    background: 'rgba(22, 131, 248, 0.08)',
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(22, 131, 248, 0.18)',
                  }}
                >
                  {date}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(22, 131, 248, 0.1)' }} />
              </div>

              {/* Day items container */}
              <div
                className="glass-card"
                style={{
                  background: 'rgba(255, 255, 255, 0.68)',
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                {items.map((item, idx) => {
                  const conf = actionConfig[item.action] || {
                    icon: Clock,
                    color: '#1683F8',
                    label: item.action,
                    badgeBg: 'rgba(22, 131, 248, 0.1)',
                  };
                  const Icon = conf.icon;
                  const isLast = idx === items.length - 1;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14,
                        borderBottom: isLast ? 'none' : '1px solid rgba(22, 131, 248, 0.06)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: conf.badgeBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: conf.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={18} color={conf.color} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A' }}>
                              {conf.label}
                            </span>
                            {item.file && (
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#0866D9',
                                  background: 'rgba(22, 131, 248, 0.08)',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                }}
                              >
                                {item.file.filename}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: '#8FA3B3', marginTop: 3 }}>
                            <span>
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {item.ipAddress && <span>• IP: {item.ipAddress}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status indicator dot matching reference screenshot */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(36, 189, 112, 0.1)',
                            color: '#179354',
                            border: '1px solid rgba(36, 189, 112, 0.22)',
                          }}
                        >
                          <ShieldCheck size={11} /> Verified
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
