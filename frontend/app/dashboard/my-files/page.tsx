'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Download,
  Share2,
  Trash2,
  Eye,
  MoreVertical,
  Lock,
  Globe,
  SortAsc,
  SortDesc,
  Files,
  Upload,
  Star,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { filesApi } from '../../../lib/api';
import Link from 'next/link';
import ShareModal from '../../../components/modals/ShareModal';
import PreviewModal from '../../../components/modals/PreviewModal';
import { toast } from 'sonner';
import { loadPrivateKey } from '../../../lib/crypto/keyManager';
import { decryptFile } from '../../../lib/crypto/fileEncryptor';

type SortField = 'createdAt' | 'filename' | 'size';
type SortOrder = 'asc' | 'desc';

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
  if (mimeType?.includes('text') || mimeType?.includes('code')) return '📝';
  return '📁';
}

export default function MyFilesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearch(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['files', { search, sortField, sortOrder }],
    queryFn: () =>
      filesApi
        .list({ search: search || undefined, sort: sortField, order: sortOrder })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File moved to trash');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete file');
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (file: FileRecord) => filesApi.update(file.id, { isFavorite: !file.isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Failed to update favorite status'),
  });

  const handleDownloadFile = async (file: FileRecord) => {
    try {
      const passphrase = prompt('Enter your master passphrase to decrypt and download:');
      if (!passphrase) return;

      toast.loading('Downloading and decrypting...', { id: 'download-toast' });

      const privateKey = await loadPrivateKey(passphrase);
      if (!privateKey) throw new Error('Private key not found. Please restore from your key backup file.');

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

      const blob = new Blob([decryptedBuffer], { type: fileMeta.mimeType });
      if (blob.size === 0) {
        toast.error('Downloaded file is empty.', { id: 'download-toast' });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMeta.originalName || fileMeta.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success('Download complete', { id: 'download-toast' });
    } catch (err: any) {
      toast.error(err.message || 'Decryption failed', { id: 'download-toast' });
    }
  };

  const files: FileRecord[] = data?.files || [];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map((f) => f.id));
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
          width: '100%',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
            <span>SecureVault</span>
            <span>/</span>
            <span style={{ color: '#0866D9', fontWeight: 600 }}>My Files</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
            My Files
          </h1>
          <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
            {files.length} client-side encrypted {files.length === 1 ? 'file' : 'files'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/dashboard/upload" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 14 }}>
              <Upload size={15} />
              <span>Upload Files</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ─── Search, Filters & View Toggle Controls ───────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: 'rgba(255, 255, 255, 0.65)',
          width: '100%',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          <Search
            size={15}
            color="#8FA3B3"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            id="files-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or keyword..."
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

        {/* Sort & View Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sort Buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([['createdAt', 'Date'], ['filename', 'Name'], ['size', 'Size']] as [SortField, string][]).map(
              ([field, label]) => {
                const isActive = sortField === field;
                return (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: 10,
                      background: isActive ? 'rgba(22, 131, 248, 0.12)' : 'rgba(255, 255, 255, 0.65)',
                      border: isActive ? '1px solid rgba(22, 131, 248, 0.28)' : '1px solid rgba(255, 255, 255, 0.75)',
                      color: isActive ? '#0866D9' : '#5E7385',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{label}</span>
                    {isActive && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                  </button>
                );
              }
            )}
          </div>

          <div style={{ width: 1, height: 20, background: 'rgba(22, 131, 248, 0.15)' }} />

          {/* Grid / List View Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 10,
              padding: 2,
              border: '1px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#0866D9' : '#8FA3B3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'grid' ? '0 2px 6px rgba(35, 94, 138, 0.1)' : 'none',
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: viewMode === 'list' ? '#0866D9' : '#8FA3B3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'list' ? '0 2px 6px rgba(35, 94, 138, 0.1)' : 'none',
              }}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Files View (Grid or List) ─────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
              background: 'rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#1683F8',
            }}
          >
            <Files size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 6 }}>
            {search ? 'No files match your search' : 'No files in your vault yet'}
          </h3>
          <p style={{ fontSize: 14, color: '#718493', marginBottom: 20 }}>
            {search ? 'Try clearing your search query' : 'Upload and client-side encrypt your documents.'}
          </p>
          <Link href="/dashboard/upload">
            <button className="btn-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
              <Upload size={15} />
              Upload Encrypted File
            </button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── Grid View ──────────────────────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {files.map((file) => {
            const isSelected = selectedFileIds.includes(file.id);
            return (
              <motion.div
                key={file.id}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.18 }}
                className="glass-card"
                style={{
                  padding: '18px 20px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.65)',
                  border: isSelected ? '1px solid #1683F8' : '1px solid rgba(255, 255, 255, 0.75)',
                  boxShadow: isSelected ? '0 8px 24px rgba(22, 131, 248, 0.15)' : '0 4px 18px rgba(35, 94, 138, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 20,
                  position: 'relative',
                }}
              >
                {/* Top: Icon + Title + Star */}
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => toggleFavoriteMutation.mutate(file)}
                        title={file.isFavorite ? 'Remove star' : 'Star file'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: file.isFavorite ? '#F4AB36' : '#8FA3B3',
                          padding: 4,
                        }}
                      >
                        <Star size={16} fill={file.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#718493', marginBottom: 12 }}>
                    <span>{formatSize(parseInt(file.size || '0', 10))}</span>
                    <span>•</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Security Badge */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(36, 189, 112, 0.1)',
                        color: '#179354',
                        border: '1px solid rgba(36, 189, 112, 0.22)',
                      }}
                    >
                      <Lock size={10} />
                      {file.layerCount > 1 ? `${file.layerCount}-Layer` : 'AES-256-GCM'}
                    </span>
                    {(file._count?.shares || 0) > 0 && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(22, 131, 248, 0.1)',
                          color: '#0866D9',
                          border: '1px solid rgba(22, 131, 248, 0.22)',
                        }}
                      >
                        Shared ({file._count?.shares})
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTop: '1px solid rgba(22, 131, 248, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPreviewFileId(file.id)}
                      title="Preview"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, borderRadius: 10 }}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => setShareFileId(file.id)}
                      title="Share"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, borderRadius: 10 }}
                    >
                      <Share2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      title="Download"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, borderRadius: 10 }}
                    >
                      <Download size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Move "${file.filename}" to trash?`)) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                    title="Move to trash"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8FA3B3',
                      cursor: 'pointer',
                      padding: 6,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F04444')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8FA3B3')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ─── List View (Matching Reference Table Styling) ───────────────── */
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.65)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(22, 131, 248, 0.1)', color: '#8FA3B3', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '8px 10px 12px 4px', width: 32 }}>
                  <input
                    type="checkbox"
                    checked={selectedFileIds.length === files.length && files.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: '#1683F8', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px 12px' }}>Name</th>
                <th style={{ padding: '8px 12px 12px' }}>Date</th>
                <th style={{ padding: '8px 12px 12px' }}>Size</th>
                <th style={{ padding: '8px 12px 12px' }}>Security</th>
                <th style={{ padding: '8px 12px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <tr
                    key={file.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.8)',
                      background: isSelected ? 'rgba(22, 131, 248, 0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 10px 12px 4px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(file.id)}
                        style={{ accentColor: '#1683F8', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{getFileEmoji(file.mimeType)}</span>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                            {file.filename}
                          </p>
                          <span style={{ fontSize: 11, color: '#8FA3B3' }}>{file.mimeType}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: 12.5, color: '#718493' }}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12.5, color: '#718493' }}>
                      {formatSize(parseInt(file.size || '0', 10))}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(36, 189, 112, 0.1)',
                          color: '#179354',
                          border: '1px solid rgba(36, 189, 112, 0.22)',
                        }}
                      >
                        <Lock size={10} />
                        {file.layerCount > 1 ? `${file.layerCount}-Layer` : 'AES-256'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setPreviewFileId(file.id)}
                          title="Preview"
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            border: '1px solid rgba(22, 131, 248, 0.2)',
                            borderRadius: 8,
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#1683F8',
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setShareFileId(file.id)}
                          title="Share"
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            border: '1px solid rgba(22, 131, 248, 0.2)',
                            borderRadius: 8,
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#0866D9',
                          }}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          title="Download"
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            border: '1px solid rgba(22, 131, 248, 0.2)',
                            borderRadius: 8,
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#24BD70',
                          }}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Move "${file.filename}" to trash?`)) {
                              deleteMutation.mutate(file.id);
                            }
                          }}
                          title="Delete"
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            border: '1px solid rgba(240, 68, 68, 0.2)',
                            borderRadius: 8,
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#F04444',
                          }}
                        >
                          <Trash2 size={14} />
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

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {previewFileId && (
        <PreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
      )}
      {shareFileId && (
        <ShareModal fileId={shareFileId} onClose={() => setShareFileId(null)} />
      )}
    </div>
  );
}
