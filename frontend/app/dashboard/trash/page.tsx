'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => filesApi.trash().then((r) => r.data),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('File permanently removed');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete file'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => filesApi.update(id, { folderId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File restored to vault');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to restore file'),
  });

  const files = data?.files || [];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Trash</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Trash
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Items in trash can be restored or permanently removed from cloud storage
        </p>
      </div>

      {isLoading ? (
        <div className="glass-card skeleton" style={{ height: 180, borderRadius: 20 }} />
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
              background: 'rgba(240, 68, 68, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#F04444',
            }}
          >
            <Trash2 size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
            Trash is empty
          </h3>
          <p style={{ fontSize: 13.5, color: '#718493' }}>
            Files moved to trash will remain here until permanently deleted.
          </p>
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
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(240, 68, 68, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F04444',
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                    {file.filename}
                  </h4>
                  <p style={{ fontSize: 12, color: '#718493', margin: '3px 0 0' }}>
                    Deleted on {new Date(file.deletedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => restoreMutation.mutate(file.id)}
                  disabled={restoreMutation.isPending}
                  className="btn-secondary"
                  style={{ padding: '7px 14px', fontSize: 12, borderRadius: 10 }}
                >
                  <RotateCcw size={13} />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Permanently delete "${file.filename}"? This action cannot be undone.`)) {
                      permanentDeleteMutation.mutate(file.id);
                    }
                  }}
                  disabled={permanentDeleteMutation.isPending}
                  className="btn-danger"
                  style={{ padding: '7px 14px', fontSize: 12, borderRadius: 10 }}
                >
                  <Trash2 size={13} />
                  <span>Delete Forever</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
