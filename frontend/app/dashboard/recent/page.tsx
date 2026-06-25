'use client';
import { motion } from 'framer-motion';
import { filesApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Clock, Files, Upload } from 'lucide-react';
import Link from 'next/link';

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['files', { sort: 'createdAt', order: 'desc' }],
    queryFn: () => filesApi.list({ sort: 'createdAt', order: 'desc' }).then((r) => r.data),
  });

  const files = (data?.files || []).slice(0, 20);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Recent</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Your 20 most recently uploaded files</p>
      </motion.div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Clock size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No recent files</h3>
          <Link href="/dashboard/upload" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
            <Upload size={16} /> Upload First File
          </Link>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {files.map((file: { id: string; filename: string; mimeType: string; size: string; encryptionType: string; createdAt: string }, i: number) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>
                {file.mimeType?.includes('pdf') ? '📄' : file.mimeType?.includes('image') ? '🖼️' : '📁'}
              </span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p className="truncate" style={{ fontWeight: 500, fontSize: 14 }}>{file.filename}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatSize(parseInt(file.size))} • {new Date(file.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="badge badge-accent" style={{ fontSize: 10 }}>🔐 Encrypted</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
