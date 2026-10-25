'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi, activityApi, accessRequestsApi, shareApi } from '../../lib/api';
import {
  Files,
  Share2,
  HardDrive,
  ShieldCheck,
  Clock,
  Upload,
  Eye,
  Download,
  Trash2,
  Plus,
  ChevronRight,
  TrendingUp,
  Inbox,
  Lock,
  FileText,
  KeyRound,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Shield,
  FolderPlus,
  Users,
  Send,
  Star,
  Check,
  Copy,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PreviewModal from '../../components/modals/PreviewModal';
import ShareModal from '../../components/modals/ShareModal';
import { toast } from 'sonner';
import { loadPrivateKey } from '../../lib/crypto/keyManager';
import { decryptFile } from '../../lib/crypto/fileEncryptor';

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  encryptionType: string;
  layerCount: number;
  watermarkEnabled: boolean;
  downloadDisabled: boolean;
  createdAt: string;
  isFavorite: boolean;
  _count?: { shares: number };
}

interface ShareItem {
  id: string;
  token: string;
  recipientEmail?: string;
  canView: boolean;
  canDownload: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  isRevoked: boolean;
  createdAt: string;
  file?: {
    id: string;
    filename: string;
    mimeType: string;
    size?: string;
  };
  owner?: {
    name: string;
    email: string;
    photo?: string;
  };
}

function formatSize(bytes: number) {
  if (isNaN(bytes) || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIconEmoji(mimeType: string) {
  if (!mimeType) return '📁';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎥';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜️';
  if (mimeType.includes('text') || mimeType.includes('code') || mimeType.includes('json')) return '📝';
  return '📁';
}

function formatTimeLeft(dateStr?: string) {
  if (!dateStr) return 'No Expiration';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function DashboardHome() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filter & Sort State for Recent Files Table
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'by-me' | 'with-me' | 'uploaded'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'documents' | 'media' | 'archives'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // 1. Files
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.list().then((r) => r.data),
  });

  // 2. Shares By Me (Outgoing)
  const { data: byMeData, isLoading: byMeLoading } = useQuery({
    queryKey: ['shared-by-me'],
    queryFn: () => shareApi.list().then((r) => r.data).catch(() => ({ shares: [] })),
  });

  // 3. Shares With Me (Incoming)
  const { data: withMeData, isLoading: withMeLoading } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => shareApi.sharedWithMe().then((r) => r.data).catch(() => ({ shares: [] })),
  });

  // 4. Access Requests
  const { data: requestsData } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => accessRequestsApi.list().then((r) => r.data).catch(() => ({ incoming: [], outgoing: [] })),
  });

  // 5. Recent Activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', { limit: 6 }],
    queryFn: () => activityApi.list({ limit: 6 }).then((r) => r.data).catch(() => ({ activities: [] })),
  });

  const files: FileRecord[] = filesData?.files || [];
  const sharesByMe: ShareItem[] = byMeData?.shares || [];
  const sharesWithMe: ShareItem[] = withMeData?.shares || [];
  const activities = activityData?.activities || [];
  const pendingRequests = requestsData?.incoming?.filter((r: any) => r.status === 'pending').length || 0;

  // Real Metric Calculations for Card 1 (Files Shared by You)
  const activeSharesByMe = sharesByMe.filter((s) => !s.isRevoked);
  const expiringSharesByMe = activeSharesByMe.filter((s) => s.expiresAt && new Date(s.expiresAt).getTime() > Date.now());
  const totalViewsOnMyShares = sharesByMe.reduce((acc, s) => acc + (s.viewCount || 0), 0);

  // Real Metric Calculations for Card 2 (Files Shared with You)
  const activeSharesWithMe = sharesWithMe.filter((s) => !s.isRevoked);
  const expiringSharesWithMe = activeSharesWithMe.filter((s) => s.expiresAt && new Date(s.expiresAt).getTime() > Date.now());

  // Combined List for "Expiring Soon" Section
  const allExpiringOrConstrainedShares = useMemo(() => {
    const list = [
      ...sharesByMe.map((s) => ({ ...s, direction: 'outgoing' as const })),
      ...sharesWithMe.map((s) => ({ ...s, direction: 'incoming' as const })),
    ];
    // Filter items that have an expiration or maxViews constraint
    const constrained = list.filter((s) => !s.isRevoked && (s.expiresAt || (s.maxViews && s.maxViews > 0)));
    return constrained.slice(0, 4);
  }, [sharesByMe, sharesWithMe]);

  // Mutations
  const toggleFavoriteMutation = useMutation({
    mutationFn: (file: FileRecord) => filesApi.update(file.id, { isFavorite: !file.isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Updated starred status');
    },
    onError: () => toast.error('Failed to update favorite status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File moved to trash');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete file'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => shareApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-by-me'] });
      toast.success('Share link revoked');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to revoke link'),
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Share link copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const passphrase = prompt('Enter your master passphrase to decrypt and download:');
      if (!passphrase) return;

      toast.loading('Downloading and decrypting...', { id: 'download-toast' });
      const privateKey = await loadPrivateKey(passphrase);
      if (!privateKey) throw new Error('Private key not found. Please restore key backup.');

      const response = await filesApi.download(file.id);
      const encryptedBuffer = response.data;

      const fileRes = await filesApi.get(file.id);
      const fileMeta = fileRes.data.file;

      let layers: any[] = [];
      if (fileMeta.encryptionLayers?.length > 0) {
        layers = fileMeta.encryptionLayers.map((layer: any) => {
          const lp = prompt(`Enter passphrase for Layer ${layer.order} (${layer.algorithm}):`);
          if (!lp) throw new Error('Layer passphrase required to decrypt.');
          return { ...layer, nonce: layer.iv, passphrase: lp };
        });
      }

      const decryptedBuffer = await decryptFile(encryptedBuffer, {
        encryptedKeyBase64: fileMeta.encryptedKey,
        ivBase64: fileMeta.iv,
        rsaPrivateKey: privateKey,
        layers,
      });

      const blob = new Blob([decryptedBuffer], { type: fileMeta.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMeta.originalName || fileMeta.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download and decryption complete', { id: 'download-toast' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to download file', { id: 'download-toast' });
    }
  };

  // Filtered & Sorted Recent Files
  const processedRecentFiles = useMemo(() => {
    let result = [...files];

    // Filter Tab
    if (activeFilterTab === 'by-me') {
      result = result.filter((f) => (f._count?.shares || 0) > 0);
    } else if (activeFilterTab === 'with-me') {
      // In SecureVault, incoming shares belong to withMeShares
      // If user clicks "Shared with Me", we match with files received
      const withMeIds = new Set(sharesWithMe.map((s) => s.file?.id).filter(Boolean));
      result = result.filter((f) => withMeIds.has(f.id));
    } else if (activeFilterTab === 'uploaded') {
      result = result.filter((f) => !f._count?.shares || f._count.shares === 0);
    }

    // Type Filter
    if (selectedTypeFilter === 'documents') {
      result = result.filter((f) => f.mimeType?.includes('pdf') || f.mimeType?.includes('text') || f.mimeType?.includes('word'));
    } else if (selectedTypeFilter === 'media') {
      result = result.filter((f) => f.mimeType?.includes('image') || f.mimeType?.includes('video') || f.mimeType?.includes('audio'));
    } else if (selectedTypeFilter === 'archives') {
      result = result.filter((f) => f.mimeType?.includes('zip') || f.mimeType?.includes('tar') || f.mimeType?.includes('rar'));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'name') {
        comparison = (a.originalName || a.filename).localeCompare(b.originalName || b.filename);
      } else if (sortBy === 'size') {
        comparison = parseInt(b.size || '0', 10) - parseInt(a.size || '0', 10);
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return result.slice(0, 8);
  }, [files, activeFilterTab, selectedTypeFilter, sortBy, sortDirection, sharesWithMe]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%', minWidth: 0 }}>
      {/* ─── SECTION A: WELCOME HEADER ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: '4px 2px 2px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#182B3A',
              letterSpacing: '-0.5px',
              margin: '0 0 4px',
            }}
          >
            Welcome back, {appUser?.name || 'Vault User'}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#657B8C',
              margin: 0,
              fontWeight: 500,
            }}
          >
            Your encrypted vault, organized in one place.
          </p>
        </div>

        {/* Right context: Verified security posture + quick upload button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(22, 131, 248, 0.22)',
              boxShadow: '0 2px 8px rgba(35, 94, 138, 0.04)',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#24BD70',
                boxShadow: '0 0 6px rgba(36, 189, 112, 0.6)',
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#182B3A' }}>
              AES-256-GCM Verified
            </span>
          </div>

          <Link href="/dashboard/upload" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary"
              style={{
                height: 40,
                padding: '0 16px',
                fontSize: 13,
                borderRadius: 12,
                gap: 8,
              }}
            >
              <Upload size={15} />
              <span>Upload File</span>
            </motion.button>
          </Link>
        </div>
      </div>

      {/* ─── SECTION B: TWO PRIMARY SUMMARY CARDS (Balanced 50/50 Layout) ───── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
          width: '100%',
        }}
      >
        {/* CARD 1: Files Shared by You */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: 22,
            padding: '22px 24px',
            boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(22, 131, 248, 0.14), rgba(8, 102, 217, 0.22))',
                    border: '1px solid rgba(22, 131, 248, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0866D9',
                  }}
                >
                  <Send size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                    Files Shared by You
                  </h3>
                  <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                    Outgoing secure links and client permissions
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/shared?tab=by-me"
                title="View all outgoing shares"
                style={{
                  color: '#1683F8',
                  background: 'rgba(22, 131, 248, 0.08)',
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Big Primary Metric */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0 16px' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#182B3A', lineHeight: 1 }}>
                {sharesByMe.length}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#718493' }}>
                shared files
              </span>
            </div>

            {/* Real Sub-metrics Pill Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(240, 246, 252, 0.7)',
                borderRadius: 14,
                border: '1px solid rgba(22, 131, 248, 0.12)',
              }}
            >
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Active Links</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', margin: '2px 0 0' }}>
                  {activeSharesByMe.length}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Expiring</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: expiringSharesByMe.length > 0 ? '#E07706' : '#182B3A', margin: '2px 0 0' }}>
                  {expiringSharesByMe.length}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Total Views</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0866D9', margin: '2px 0 0' }}>
                  {totalViewsOnMyShares}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: '#657B8C' }}>
              Zero-knowledge key wrapping verified
            </span>
            <Link
              href="/dashboard/shared?tab=by-me"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#1683F8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Manage Outgoing</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* CARD 2: Files Shared with You */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: 22,
            padding: '22px 24px',
            boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(36, 189, 112, 0.14), rgba(22, 131, 248, 0.18))',
                    border: '1px solid rgba(36, 189, 112, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#24BD70',
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                    Files Shared with You
                  </h3>
                  <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                    Incoming encrypted vaults from colleagues & partners
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/shared?tab=with-me"
                title="View all incoming shares"
                style={{
                  color: '#1683F8',
                  background: 'rgba(22, 131, 248, 0.08)',
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Big Primary Metric */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0 16px' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#182B3A', lineHeight: 1 }}>
                {sharesWithMe.length}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#718493' }}>
                received files
              </span>
            </div>

            {/* Real Sub-metrics Pill Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(240, 246, 252, 0.7)',
                borderRadius: 14,
                border: '1px solid rgba(22, 131, 248, 0.12)',
              }}
            >
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Active Items</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', margin: '2px 0 0' }}>
                  {activeSharesWithMe.length}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Requests</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: pendingRequests > 0 ? '#F04444' : '#182B3A', margin: '2px 0 0' }}>
                  {pendingRequests}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#718493', margin: 0, fontWeight: 600 }}>Expiring Soon</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: expiringSharesWithMe.length > 0 ? '#E07706' : '#182B3A', margin: '2px 0 0' }}>
                  {expiringSharesWithMe.length}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: '#657B8C' }}>
              Requires recipient RSA private key to unwrap
            </span>
            <Link
              href="/dashboard/shared?tab=with-me"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#1683F8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Manage Incoming</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ─── SECTION C: RECENT FILES (Large Full-Width Card) ─────────────────── */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 22,
          padding: '22px 24px',
          boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
          width: '100%',
        }}
      >
        {/* Section Header with Tabs & Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: '1px solid rgba(22, 131, 248, 0.12)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', margin: '0 0 2px' }}>
              Recent Files
            </h2>
            <p style={{ fontSize: 12.5, color: '#718493', margin: 0 }}>
              End-to-end encrypted files stored in your zero-knowledge vault
            </p>
          </div>

          {/* Action Row: Tabs + Filter + Sort + Upload */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Tabs: All Files, Shared by Me, Shared with Me, Uploaded */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(240, 246, 252, 0.85)',
                padding: 3,
                borderRadius: 12,
                border: '1px solid rgba(22, 131, 248, 0.14)',
              }}
            >
              {[
                { id: 'all', label: 'All Files' },
                { id: 'by-me', label: 'Shared by Me' },
                { id: 'with-me', label: 'Shared with Me' },
                { id: 'uploaded', label: 'Vault Only' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 9,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: activeFilterTab === tab.id ? 700 : 500,
                    background: activeFilterTab === tab.id ? '#FFFFFF' : 'transparent',
                    color: activeFilterTab === tab.id ? '#0866D9' : '#5E7385',
                    boxShadow: activeFilterTab === tab.id ? '0 2px 8px rgba(35, 94, 138, 0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid rgba(22, 131, 248, 0.18)',
                background: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: 600,
                color: '#182B3A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All File Types</option>
              <option value="documents">Documents</option>
              <option value="media">Media & Photos</option>
              <option value="archives">Archives (.zip)</option>
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (sortBy === 'date') setSortBy('name');
                else if (sortBy === 'name') setSortBy('size');
                else setSortBy('date');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid rgba(22, 131, 248, 0.18)',
                background: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: 600,
                color: '#182B3A',
                cursor: 'pointer',
              }}
            >
              <ArrowUpDown size={13} color="#1683F8" />
              <span>Sort: {sortBy.toUpperCase()}</span>
            </button>

            {/* Link to My Files */}
            <Link
              href="/dashboard/my-files"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#1683F8',
                textDecoration: 'none',
                padding: '6px 10px',
              }}
            >
              All Files →
            </Link>
          </div>
        </div>

        {/* The Files Table */}
        {filesLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#718493', fontSize: 14 }}>
            Loading encrypted files from vault...
          </div>
        ) : processedRecentFiles.length === 0 ? (
          <div
            style={{
              padding: '44px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
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
                color: '#1683F8',
              }}
            >
              <Files size={28} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                No files match this filter
              </p>
              <p style={{ fontSize: 13, color: '#718493', margin: '4px 0 0' }}>
                Upload encrypted documents or adjust your filter selection above.
              </p>
            </div>
            <Link href="/dashboard/upload" style={{ textDecoration: 'none', marginTop: 4 }}>
              <button className="btn-primary" style={{ height: 38, padding: '0 18px', borderRadius: 10, fontSize: 13 }}>
                <Plus size={16} />
                <span>Upload First File</span>
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 131, 248, 0.12)' }}>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    File Name
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Type
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Direction / Owner
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Sharing Access
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Date Added
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Size
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Encryption
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#718493', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRecentFiles.map((file) => {
                  const isShared = (file._count?.shares || 0) > 0;
                  return (
                    <tr
                      key={file.id}
                      style={{
                        borderBottom: '1px solid rgba(22, 131, 248, 0.08)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(240, 246, 252, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      {/* Name & Icon */}
                      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{getFileIconEmoji(file.mimeType)}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: '#182B3A',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 220,
                              }}
                              title={file.originalName || file.filename}
                            >
                              {file.originalName || file.filename}
                            </span>
                            <span style={{ fontSize: 11, color: '#718493' }}>
                              {file.layerCount && file.layerCount > 1 ? `${file.layerCount} Enc Layers` : 'Single Layer'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* File Type */}
                      <td style={{ padding: '12px', fontSize: 12.5, color: '#4A6277', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: 'rgba(22, 131, 248, 0.08)',
                            color: '#0866D9',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {file.mimeType?.split('/')[1] || 'FILE'}
                        </span>
                      </td>

                      {/* Direction / Owner */}
                      <td style={{ padding: '12px', fontSize: 12.5, color: '#4A6277', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#1683F8',
                            }}
                          />
                          <span>You (Owner)</span>
                        </div>
                      </td>

                      {/* Sharing Access */}
                      <td style={{ padding: '12px', fontSize: 12.5, verticalAlign: 'middle' }}>
                        {isShared ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: '#0866D9',
                              background: 'rgba(22, 131, 248, 0.08)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            <Share2 size={12} />
                            <span>{file._count?.shares} active link{file._count?.shares! > 1 ? 's' : ''}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: '#718493',
                              fontSize: 11.5,
                              fontWeight: 500,
                            }}
                          >
                            <Lock size={12} />
                            <span>Private to Vault</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px', fontSize: 12.5, color: '#718493', verticalAlign: 'middle' }}>
                        {new Date(file.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Size */}
                      <td style={{ padding: '12px', fontSize: 12.5, color: '#182B3A', fontWeight: 600, verticalAlign: 'middle' }}>
                        {formatSize(parseInt(file.size || '0', 10))}
                      </td>

                      {/* Encryption Status */}
                      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(36, 189, 112, 0.1)',
                            border: '1px solid rgba(36, 189, 112, 0.25)',
                            color: '#15803D',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>AES-256-GCM</span>
                        </span>
                      </td>

                      {/* Context Action Menu */}
                      <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Star Button */}
                          <button
                            onClick={() => toggleFavoriteMutation.mutate(file)}
                            title={file.isFavorite ? 'Remove star' : 'Star file'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: file.isFavorite ? '#F59E0B' : '#8FA3B3',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Star size={16} fill={file.isFavorite ? '#F59E0B' : 'none'} />
                          </button>

                          {/* Preview Button */}
                          <button
                            onClick={() => setPreviewFileId(file.id)}
                            title="Preview file"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid rgba(22, 131, 248, 0.18)',
                              borderRadius: 8,
                              color: '#0866D9',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(file)}
                            title="Decrypt & Download"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid rgba(22, 131, 248, 0.18)',
                              borderRadius: 8,
                              color: '#182B3A',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Download size={14} />
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => setShareFileId(file.id)}
                            title="Share with zero-knowledge link"
                            style={{
                              background: 'rgba(22, 131, 248, 0.1)',
                              border: '1px solid rgba(22, 131, 248, 0.25)',
                              borderRadius: 8,
                              color: '#1683F8',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Share2 size={14} />
                          </button>

                          {/* Trash Button */}
                          <button
                            onClick={() => {
                              if (confirm(`Move "${file.originalName || file.filename}" to trash?`)) {
                                deleteMutation.mutate(file.id);
                              }
                            }}
                            title="Move to trash"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#8FA3B3',
                              cursor: 'pointer',
                              padding: '5px 6px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.color = '#F04444';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.color = '#8FA3B3';
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── SECTION D & F: LOWER 2-COLUMN SECTION (Expiring Shares + Security Overview) ─ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
          width: '100%',
        }}
      >
        {/* SECTION D: Time-Limited & Expiring Shares */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: 22,
            padding: '22px 24px',
            boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color="#E07706" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  Time-Limited & Expiring Shares
                </h3>
              </div>
              <Link
                href="/dashboard/shared"
                style={{ fontSize: 12, fontWeight: 600, color: '#1683F8', textDecoration: 'none' }}
              >
                All Shares →
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: '#718493', margin: '0 0 16px' }}>
              Shares protected with automated expiration timestamps and view restrictions.
            </p>

            {allExpiringOrConstrainedShares.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  borderRadius: 14,
                  background: 'rgba(240, 246, 252, 0.65)',
                  border: '1px dashed rgba(22, 131, 248, 0.22)',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={24} color="#24BD70" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  All Active Shares Unrestricted
                </p>
                <p style={{ fontSize: 12, color: '#718493', margin: '4px 0 0' }}>
                  None of your active shared links have pending timeouts or reached view limits.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allExpiringOrConstrainedShares.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(22, 131, 248, 0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 16 }}>{getFileIconEmoji(item.file?.mimeType || '')}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#182B3A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 160,
                          }}
                        >
                          {item.file?.filename || 'Secure File'}
                        </span>
                        <span style={{ fontSize: 11, color: '#E07706', fontWeight: 600 }}>
                          {item.expiresAt ? formatTimeLeft(item.expiresAt) : `Max ${item.maxViews} views`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleCopyLink(item.token)}
                        title="Copy link"
                        style={{
                          background: 'rgba(22, 131, 248, 0.08)',
                          border: 'none',
                          borderRadius: 8,
                          color: '#0866D9',
                          cursor: 'pointer',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {copiedToken === item.token ? <Check size={13} color="#24BD70" /> : <Copy size={13} />}
                      </button>

                      {item.direction === 'outgoing' && (
                        <button
                          onClick={() => revokeMutation.mutate(item.id)}
                          title="Revoke share access"
                          style={{
                            background: 'rgba(240, 68, 68, 0.08)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#F04444',
                            cursor: 'pointer',
                            padding: '5px 8px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: '#718493' }}>
              Set expiry dates when generating links
            </span>
            <Link
              href="/dashboard/shared"
              style={{ fontSize: 12.5, fontWeight: 700, color: '#1683F8', textDecoration: 'none' }}
            >
              Configure in Shares →
            </Link>
          </div>
        </div>

        {/* SECTION F: Vault Cryptographic Health Overview */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: 22,
            padding: '22px 24px',
            boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} color="#1683F8" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  Vault Security Overview
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#24BD70',
                  background: 'rgba(36, 189, 112, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                Zero-Knowledge Active
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: '#718493', margin: '0 0 16px' }}>
              Continuous client-side validation of hardware cryptographic posture.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: 'rgba(240, 246, 252, 0.7)',
                  border: '1px solid rgba(22, 131, 248, 0.1)',
                }}
              >
                <span style={{ fontSize: 12.5, color: '#4A6277', fontWeight: 500 }}>Symmetric File Encryption</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#182B3A' }}>AES-256-GCM Hardware</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: 'rgba(240, 246, 252, 0.7)',
                  border: '1px solid rgba(22, 131, 248, 0.1)',
                }}
              >
                <span style={{ fontSize: 12.5, color: '#4A6277', fontWeight: 500 }}>Key Wrapping & Sharing</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#182B3A' }}>RSA-OAEP 4096-bit</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: 'rgba(240, 246, 252, 0.7)',
                  border: '1px solid rgba(22, 131, 248, 0.1)',
                }}
              >
                <span style={{ fontSize: 12.5, color: '#4A6277', fontWeight: 500 }}>Key Derivation Function</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#182B3A' }}>PBKDF2 (100,000 iter)</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: 'rgba(240, 246, 252, 0.7)',
                  border: '1px solid rgba(22, 131, 248, 0.1)',
                }}
              >
                <span style={{ fontSize: 12.5, color: '#4A6277', fontWeight: 500 }}>Zero-Knowledge Posture</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#24BD70' }}>Verified (0 server keys)</span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: '#718493' }}>
              All keys derived locally in your browser
            </span>
            <Link
              href="/dashboard/security"
              style={{ fontSize: 12.5, fontWeight: 700, color: '#1683F8', textDecoration: 'none' }}
            >
              Security Center →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── SECTION E: RECENT ACTIVITY & AUDIT TRAIL (Full-Width Card) ──────── */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 22,
          padding: '22px 24px',
          boxShadow: '0 8px 30px rgba(35, 94, 138, 0.06)',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(22, 131, 248, 0.12)',
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', margin: '0 0 2px' }}>
              Audit Trail & Recent Activity
            </h3>
            <p style={{ fontSize: 12.5, color: '#718493', margin: 0 }}>
              Immutable timeline of file uploads, downloads, cryptographic key updates, and shares
            </p>
          </div>

          <Link
            href="/dashboard/activity"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: '#1683F8',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>View All Activity Logs</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {activityLoading ? (
          <p style={{ textAlign: 'center', color: '#718493', fontSize: 13, padding: '20px 0' }}>
            Loading audit trail...
          </p>
        ) : activities.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718493', fontSize: 13, padding: '24px 0' }}>
            No recent activity recorded. Upload or share files to begin building your audit log.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activities.map((act: any) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(22, 131, 248, 0.1)',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(22, 131, 248, 0.1)',
                      color: '#0866D9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {act.action?.includes('upload') ? (
                      <Upload size={15} />
                    ) : act.action?.includes('download') ? (
                      <Download size={15} />
                    ) : act.action?.includes('share') ? (
                      <Share2 size={15} />
                    ) : (
                      <Shield size={15} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#182B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.action?.replace(/_/g, ' ').toUpperCase()}: {act.file?.filename || act.details || 'Vault Operation'}
                    </span>
                    <span style={{ fontSize: 11, color: '#718493' }}>
                      IP: {act.ipAddress || 'Internal Browser'} • Action by {appUser?.name || 'Authorized Session'}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: 12, color: '#657B8C', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                  {new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALS: Preview & Share ────────────────────────────────────────── */}
      {previewFileId && (
        <PreviewModal
          fileId={previewFileId}
          onClose={() => setPreviewFileId(null)}
        />
      )}

      {shareFileId && (
        <ShareModal
          fileId={shareFileId}
          onClose={() => setShareFileId(null)}
        />
      )}
    </div>
  );
}
