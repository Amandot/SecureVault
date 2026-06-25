'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { filesApi } from '../../../lib/api';
import Link from 'next/link';
import ShareModal from '../../../components/modals/ShareModal';
import PreviewModal from '../../../components/modals/PreviewModal';

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
  if (mimeType?.includes('text')) return '📝';
  return '📁';
}

function FileCardSkeleton() {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '75%', height: 14, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '50%', height: 11, borderRadius: 6 }} />
    </div>
  );
}

export default function MyFilesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Update search from URL param
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
    },
  });

  const files: FileRecord[] = data?.files || [];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
              My Files
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {files.length} encrypted {files.length === 1 ? 'file' : 'files'}
            </p>
          </div>
          <Link href="/dashboard/upload" className="btn-primary">
            <Upload size={16} /> Upload New
          </Link>
        </div>
      </motion.div>

      {/* ─── Controls ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 360 }}>
          <Search
            size={15}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            id="files-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="input-field"
            style={{ paddingLeft: 38, height: 38, fontSize: 13 }}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([['createdAt', 'Date'], ['filename', 'Name'], ['size', 'Size']] as [SortField, string][]).map(
            ([field, label]) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: sortField === field ? 600 : 400,
                  background: sortField === field ? 'var(--accent-dim)' : 'var(--card-bg)',
                  border: `1px solid ${sortField === field ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  color: sortField === field ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {label}
                {sortField === field &&
                  (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
              </button>
            )
          )}
        </div>

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginLeft: 'auto',
          }}
        >
          {([['grid', LayoutGrid], ['list', List]] as ['grid' | 'list', typeof LayoutGrid][]).map(
            ([mode, Icon]) => (
              <button
                key={mode}
                id={`view-${mode}-btn`}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 14px',
                  background: viewMode === mode ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  color: viewMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon size={16} />
              </button>
            )
          )}
        </div>
      </motion.div>

      {/* ─── Files Grid / List ───────────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr',
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => <FileCardSkeleton key={i} />)}
        </div>
      ) : files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}
        >
          <Files size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {search ? 'No files match your search' : 'No files yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            {search ? 'Try a different search term' : 'Upload your first encrypted file'}
          </p>
          {!search && (
            <Link href="/dashboard/upload" className="btn-primary">
              <Upload size={16} /> Upload File
            </Link>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {files.map((file, i) => (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
              className="glass-card"
              style={{ padding: 20, cursor: 'default', position: 'relative' }}
            >
              {/* File icon */}
              <div style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}>
                {getFileEmoji(file.mimeType)}
              </div>

              {/* Name */}
              <p
                className="truncate"
                style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}
                title={file.filename}
              >
                {file.filename}
              </p>

              {/* Meta */}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                {formatSize(parseInt(file.size))} •{' '}
                {new Date(file.createdAt).toLocaleDateString()}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
                <span className="badge badge-accent" style={{ fontSize: 10 }}>
                  <Lock size={9} /> {file.encryptionType.split('+')[0]}
                </span>
                {file.layerCount > 1 && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>
                    {file.layerCount} layers
                  </span>
                )}
                {(file._count?.shares || 0) > 0 && (
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>
                    <Globe size={9} /> shared
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id={`preview-${file.id}`}
                  title="Preview"
                  onClick={() => setPreviewFileId(file.id)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(0,200,255,0.2)',
                    borderRadius: 8,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  id={`share-${file.id}`}
                  title="Share"
                  onClick={() => setShareFileId(file.id)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: 'var(--green-dim)',
                    border: '1px solid rgba(0,227,155,0.2)',
                    borderRadius: 8,
                    color: 'var(--green)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Share2 size={14} />
                </button>
                <button
                  id={`delete-${file.id}`}
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Move "${file.filename}" to trash?`)) {
                      deleteMutation.mutate(file.id);
                    }
                  }}
                  style={{
                    padding: '7px',
                    background: 'var(--danger-dim)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8,
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* List View */
        <motion.div
          layout
          className="glass-card"
          style={{ overflow: 'hidden' }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              gap: 16,
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            <span>Name</span>
            <span>Size</span>
            <span>Encryption</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          {files.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: 16,
                padding: '14px 20px',
                borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,200,255,0.02)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <span style={{ fontSize: 20 }}>{getFileEmoji(file.mimeType)}</span>
                <span
                  className="truncate"
                  style={{ fontSize: 14, fontWeight: 500 }}
                  title={file.filename}
                >
                  {file.filename}
                </span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {formatSize(parseInt(file.size))}
              </span>
              <span className="badge badge-accent" style={{ fontSize: 10, width: 'fit-content' }}>
                <Lock size={9} />
                {file.encryptionType.split('+').length} layer{file.encryptionType.split('+').length > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(file.createdAt).toLocaleDateString()}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id={`list-preview-${file.id}`}
                  onClick={() => setPreviewFileId(file.id)}
                  className="btn-ghost"
                  style={{ padding: '6px', borderRadius: 6 }}
                  title="Preview"
                >
                  <Eye size={15} />
                </button>
                <button
                  id={`list-share-${file.id}`}
                  onClick={() => setShareFileId(file.id)}
                  className="btn-ghost"
                  style={{ padding: '6px', borderRadius: 6 }}
                  title="Share"
                >
                  <Share2 size={15} />
                </button>
                <button
                  id={`list-delete-${file.id}`}
                  onClick={() => {
                    if (confirm(`Move "${file.filename}" to trash?`)) {
                      deleteMutation.mutate(file.id);
                    }
                  }}
                  className="btn-ghost"
                  style={{ padding: '6px', borderRadius: 6, color: 'var(--danger)' }}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Share Modal */}
      <AnimatePresence>
        {shareFileId && (
          <ShareModal
            fileId={shareFileId}
            onClose={() => setShareFileId(null)}
          />
        )}
        {previewFileId && (
          <PreviewModal
            fileId={previewFileId}
            onClose={() => setPreviewFileId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
