'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';
import { Star, Download, Eye, Share2, Trash2, Lock, Files, Upload, Search } from 'lucide-react';
import Link from 'next/link';
import PreviewModal from '../../../components/modals/PreviewModal';
import ShareModal from '../../../components/modals/ShareModal';
import { toast } from 'sonner';
import { loadPrivateKey } from '../../../lib/crypto/keyManager';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileEmoji(mimeType: string) {
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('image')) return '🖼️';
  if (mimeType?.includes('video')) return '🎥';
  if (mimeType?.includes('audio')) return '🎵';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '🗜️';
  return '📁';
}

export default function FavoritesPage() {
  const [search, setSearch] = useState('');
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['files', { favorite: true, search }],
    queryFn: () => filesApi.list({ favorite: true, search: search || undefined }).then((r) => r.data),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (file: any) => filesApi.update(file.id, { isFavorite: !file.isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Favorite updated');
    },
    onError: () => toast.error('Failed to update favorite'),
  });

  const files = (data?.files || []).filter((f: any) => f.isFavorite);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Starred</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Starred Files
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Quickly access your most important encrypted documents
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 160, borderRadius: 20 }} />
          ))}
        </div>
      ) : files.length === 0 ? (
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
              background: 'rgba(244, 171, 54, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#F4AB36',
            }}
          >
            <Star size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
            No starred files yet
          </h3>
          <p style={{ fontSize: 13.5, color: '#718493', marginBottom: 18 }}>
            Click the star icon on any file in your vault to bookmark it here for quick access.
          </p>
          <Link href="/dashboard/my-files">
            <button className="btn-secondary" style={{ padding: '9px 20px', fontSize: 13 }}>
              Browse My Files
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {files.map((file: any) => (
            <div
              key={file.id}
              className="glass-card"
              style={{
                padding: '18px 20px',
                background: 'rgba(255, 255, 255, 0.68)',
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'rgba(22, 131, 248, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    {getFileEmoji(file.mimeType)}
                  </div>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate(file)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F4AB36', padding: 4 }}
                  >
                    <Star size={18} fill="#F4AB36" />
                  </button>
                </div>

                <h3
                  title={file.filename}
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: '#182B3A',
                    margin: '0 0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.filename}
                </h3>
                <p style={{ fontSize: 12, color: '#718493', margin: '0 0 12px' }}>
                  {formatSize(parseInt(file.size || '0', 10))} • AES-256
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(22, 131, 248, 0.08)',
                }}
              >
                <button
                  onClick={() => setPreviewFileId(file.id)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '6px', fontSize: 12, borderRadius: 10 }}
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => setShareFileId(file.id)}
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: 12, borderRadius: 10 }}
                >
                  <Share2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewFileId && (
        <PreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
      )}
      {shareFileId && (
        <ShareModal fileId={shareFileId} onClose={() => setShareFileId(null)} />
      )}
    </div>
  );
}
