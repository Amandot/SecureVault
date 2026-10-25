'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { filesApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Clock, Files, Upload, Eye, Download, Lock } from 'lucide-react';
import Link from 'next/link';
import PreviewModal from '../../../components/modals/PreviewModal';
import { toast } from 'sonner';
import { loadPrivateKey } from '../../../lib/crypto/keyManager';
import { decryptFile } from '../../../lib/crypto/fileEncryptor';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecentPage() {
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['files', { sort: 'createdAt', order: 'desc' }],
    queryFn: () => filesApi.list({ sort: 'createdAt', order: 'desc' }).then((r) => r.data),
  });

  const files = (data?.files || []).slice(0, 20);

  const handleDownload = async (file: any) => {
    try {
      const passphrase = prompt('Enter your master passphrase to decrypt and download:');
      if (!passphrase) return;

      toast.loading('Downloading and decrypting...', { id: 'download-toast' });
      const privateKey = await loadPrivateKey(passphrase);
      if (!privateKey) throw new Error('Private key not found. Please restore key backup.');

      const response = await filesApi.download(file.id);
      const blob = new Blob([response.data], { type: file.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download complete', { id: 'download-toast' });
    } catch (err: any) {
      toast.error(err.message || 'Download failed', { id: 'download-toast' });
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Recent</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Recent Encrypted Files
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Your 20 most recently uploaded and accessed files in SecureVault
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 75, borderRadius: 16 }} />
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
            No recent files
          </h3>
          <p style={{ fontSize: 13.5, color: '#718493', marginBottom: 18 }}>
            Upload a document to encrypt and safely store it in your digital vault.
          </p>
          <Link href="/dashboard/upload">
            <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
              <Upload size={15} />
              <span>Upload New File</span>
            </button>
          </Link>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            background: 'rgba(255, 255, 255, 0.68)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {files.map((file: any, i: number) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                padding: '16px 22px',
                borderBottom: i < files.length - 1 ? '1px solid rgba(22, 131, 248, 0.08)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(22, 131, 248, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {file.mimeType?.includes('pdf') ? '📄' : file.mimeType?.includes('image') ? '🖼️' : '📁'}
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                    {file.filename}
                  </h4>
                  <p style={{ fontSize: 12, color: '#718493', margin: '3px 0 0' }}>
                    {formatSize(parseInt(file.size || '0', 10))} • Added {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'rgba(36, 189, 112, 0.1)',
                    color: '#179354',
                    border: '1px solid rgba(36, 189, 112, 0.22)',
                  }}
                >
                  <Lock size={10} style={{ display: 'inline', marginRight: 4 }} />
                  AES-256
                </span>

                <button
                  onClick={() => setPreviewFileId(file.id)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10 }}
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => handleDownload(file)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10 }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewFileId && (
        <PreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
      )}
    </div>
  );
}
