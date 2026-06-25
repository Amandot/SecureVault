'use client';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';
import { Trash2, RotateCcw } from 'lucide-react';

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => filesApi.trash().then((r) => r.data),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  });

  const files = data?.files || [];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Trash</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Deleted files — permanently delete or restore</p>
      </motion.div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Trash2 size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Trash is empty</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Deleted files appear here</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {files.map((file: { id: string; filename: string; mimeType: string; size: string; deletedAt: string }, i: number) => (
            <div key={file.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 28 }}>{file.mimeType?.includes('pdf') ? '📄' : '📁'}</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p className="truncate" style={{ fontWeight: 500, fontSize: 14 }}>{file.filename}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Deleted {new Date(file.deletedAt).toLocaleString()}
                </p>
              </div>
              <button
                id={`perm-delete-${file.id}`}
                onClick={() => confirm('Permanently delete this file?') && permanentDeleteMutation.mutate(file.id)}
                className="btn-danger"
                style={{ padding: '7px 14px', fontSize: 12 }}
              >
                <Trash2 size={13} /> Delete Forever
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
