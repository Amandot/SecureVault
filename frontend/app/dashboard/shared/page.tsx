'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shareApi, filesApi } from '../../../lib/api';
import {
  Share2,
  Clock,
  Eye,
  Download,
  User,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Lock,
  ExternalLink,
  Users,
  Send,
  Inbox,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import PreviewModal from '../../../components/modals/PreviewModal';

type Tab = 'with-me' | 'by-me';

interface SharedWithMeItem {
  id: string;
  token: string;
  recipientEmail?: string;
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  requireOTP: boolean;
  isRevoked: boolean;
  createdAt: string;
  file: {
    id: string;
    filename: string;
    mimeType: string;
  };
  owner: {
    name: string;
    email: string;
    photo?: string;
  };
}

interface SharedByMeItem {
  id: string;
  token: string;
  recipientEmail?: string;
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  requireOTP: boolean;
  isRevoked: boolean;
  createdAt: string;
  file: {
    id: string;
    filename: string;
    mimeType: string;
  };
}

function formatTimeLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export default function SharedPage() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(urlTab === 'by-me' ? 'by-me' : 'with-me');
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (urlTab === 'by-me' || urlTab === 'with-me') {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const { data: withMeData, isLoading: loadingWithMe } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => shareApi.sharedWithMe().then((r) => r.data),
  });

  const { data: byMeData, isLoading: loadingByMe } = useQuery({
    queryKey: ['shared-by-me'],
    queryFn: () => shareApi.list().then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => shareApi.revoke(id),
    onSuccess: () => {
      toast.success('Sharing access revoked');
      queryClient.invalidateQueries({ queryKey: ['shared-by-me'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to revoke link'),
  });

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success('Share link copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const sharesWithMe: SharedWithMeItem[] = withMeData?.shares || [];
  const sharesByMe: SharedByMeItem[] = byMeData?.shares || [];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Shared Files</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Shared Files
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Manage encrypted files shared with you and links you have authorized
        </p>
      </div>

      {/* ─── Segmented Tabs ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.65)',
          padding: 6,
          borderRadius: 16,
          width: 'fit-content',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 2px 10px rgba(35, 94, 138, 0.04)',
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => setActiveTab('with-me')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'with-me' ? '1px solid rgba(22, 131, 248, 0.3)' : '1px solid transparent',
            background: activeTab === 'with-me' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'with-me' ? '#0866D9' : '#5E7385',
            boxShadow: activeTab === 'with-me' ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
            transition: 'all 0.18s ease',
          }}
        >
          <Inbox size={15} />
          <span>Shared With Me</span>
          <span
            style={{
              background: activeTab === 'with-me' ? 'rgba(22, 131, 248, 0.12)' : 'rgba(143, 163, 179, 0.14)',
              color: activeTab === 'with-me' ? '#0866D9' : '#718493',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
            }}
          >
            {sharesWithMe.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('by-me')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'by-me' ? '1px solid rgba(22, 131, 248, 0.3)' : '1px solid transparent',
            background: activeTab === 'by-me' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'by-me' ? '#0866D9' : '#5E7385',
            boxShadow: activeTab === 'by-me' ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
            transition: 'all 0.18s ease',
          }}
        >
          <Send size={15} />
          <span>Shared By Me</span>
          <span
            style={{
              background: activeTab === 'by-me' ? 'rgba(22, 131, 248, 0.12)' : 'rgba(143, 163, 179, 0.14)',
              color: activeTab === 'by-me' ? '#0866D9' : '#718493',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
            }}
          >
            {sharesByMe.length}
          </span>
        </button>
      </div>

      {/* ─── Tab Content: Shared With Me ───────────────────────────────────── */}
      {activeTab === 'with-me' ? (
        loadingWithMe ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card skeleton" style={{ height: 90, borderRadius: 18 }} />
            ))}
          </div>
        ) : sharesWithMe.length === 0 ? (
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
              <Share2 size={26} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
              Nothing shared with you yet
            </h3>
            <p style={{ fontSize: 13.5, color: '#718493', maxWidth: 420, margin: '0 auto' }}>
              When colleagues or external partners share zero-knowledge encrypted files with your email address, they will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sharesWithMe.map((share) => (
              <div
                key={share.id}
                className="glass-card"
                style={{
                  padding: '18px 22px',
                  background: 'rgba(255, 255, 255, 0.68)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderRadius: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(22, 131, 248, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1683F8',
                    }}
                  >
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                      {share.file.filename}
                    </h4>
                    <p style={{ fontSize: 12, color: '#718493', margin: '3px 0 0' }}>
                      Shared by <strong style={{ color: '#182B3A' }}>{share.owner.name}</strong> ({share.owner.email})
                    </p>
                  </div>
                </div>

                {/* Permissions & Expiry Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(36, 189, 112, 0.12)',
                      color: '#179354',
                      border: '1px solid rgba(36, 189, 112, 0.25)',
                    }}
                  >
                    {share.canDownload ? 'Download Allowed' : 'View Only'}
                  </span>

                  {share.expiresAt && (
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(244, 171, 54, 0.12)',
                        color: '#B47312',
                        border: '1px solid rgba(244, 171, 54, 0.25)',
                      }}
                    >
                      {formatTimeLeft(share.expiresAt)}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setPreviewFileId(share.file.id)}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: 12, borderRadius: 10 }}
                  >
                    <Eye size={13} />
                    <span>Open & Decrypt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ─── Tab Content: Shared By Me ───────────────────────────────────── */
        loadingByMe ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 18 }} />
            ))}
          </div>
        ) : sharesByMe.length === 0 ? (
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
              <Send size={26} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
              You haven't shared any files yet
            </h3>
            <p style={{ fontSize: 13.5, color: '#718493', maxWidth: 420, margin: '0 auto' }}>
              Generate secure public links or re-wrapped recipient shares from the My Files page.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sharesByMe.map((share) => (
              <div
                key={share.id}
                className="glass-card"
                style={{
                  padding: '18px 22px',
                  background: 'rgba(255, 255, 255, 0.68)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderRadius: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: share.isRevoked ? 'rgba(240, 68, 68, 0.1)' : 'rgba(22, 131, 248, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: share.isRevoked ? '#F04444' : '#1683F8',
                    }}
                  >
                    <Send size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                      {share.file.filename}
                    </h4>
                    <p style={{ fontSize: 12, color: '#718493', margin: '3px 0 0' }}>
                      Recipient: <strong style={{ color: '#182B3A' }}>{share.recipientEmail || 'Public Link'}</strong>
                      {' • '}Views: {share.viewCount}{share.maxViews ? `/${share.maxViews}` : ''}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: share.isRevoked ? 'rgba(240, 68, 68, 0.12)' : 'rgba(36, 189, 112, 0.12)',
                      color: share.isRevoked ? '#D32F2F' : '#179354',
                      border: share.isRevoked ? '1px solid rgba(240, 68, 68, 0.25)' : '1px solid rgba(36, 189, 112, 0.25)',
                    }}
                  >
                    {share.isRevoked ? 'Revoked' : 'Active Link'}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleCopyLink(share.token)}
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: 12, borderRadius: 10 }}
                  >
                    {copiedToken === share.token ? <Check size={13} color="#24BD70" /> : <Copy size={13} />}
                    <span>{copiedToken === share.token ? 'Copied' : 'Copy Link'}</span>
                  </button>

                  {!share.isRevoked && (
                    <button
                      onClick={() => {
                        if (confirm('Revoke access to this share?')) {
                          revokeMutation.mutate(share.id);
                        }
                      }}
                      className="btn-danger"
                      style={{ padding: '7px 12px', fontSize: 12, borderRadius: 10 }}
                    >
                      <RotateCcw size={13} />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── Preview Modal ─────────────────────────────────────────────────── */}
      {previewFileId && (
        <PreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
      )}
    </div>
  );
}
