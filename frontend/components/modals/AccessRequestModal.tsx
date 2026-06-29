import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, X, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { accessRequestsApi } from '../../lib/api';
import { toast } from 'sonner';

interface AccessRequestModalProps {
  fileId: string;
  shareId?: string | null;
  onClose: () => void;
  currentPermissions: {
    canDownload: boolean;
    canEdit: boolean;
  };
}

export default function AccessRequestModal({ fileId, shareId, onClose, currentPermissions }: AccessRequestModalProps) {
  const [requestedDownload, setRequestedDownload] = useState(!currentPermissions.canDownload);
  const [requestedEdit, setRequestedEdit] = useState(!currentPermissions.canEdit);
  const [requestedMaxViews, setRequestedMaxViews] = useState<string>('');
  const [requestedExpiresAt, setRequestedExpiresAt] = useState<string>('');
  const [message, setMessage] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      await accessRequestsApi.create({
        fileId,
        shareId: shareId || null,
        message: message.trim() || undefined,
        requestedDownload,
        requestedEdit,
        requestedExpiresAt: requestedExpiresAt ? new Date(requestedExpiresAt).toISOString() : null,
        requestedMaxViews: requestedMaxViews ? parseInt(requestedMaxViews) : null,
      });
    },
    onSuccess: () => {
      toast.success('Access request sent successfully.');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to send request');
    }
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--card-bg)',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Request Access</h3>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Select the additional permissions you want to request from the file owner.
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requestedDownload}
              onChange={(e) => setRequestedDownload(e.target.checked)}
              disabled={currentPermissions.canDownload}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 14, color: currentPermissions.canDownload ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              Download Permission {currentPermissions.canDownload && '(Already have)'}
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requestedEdit}
              onChange={(e) => setRequestedEdit(e.target.checked)}
              disabled={currentPermissions.canEdit}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 14, color: currentPermissions.canEdit ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              Edit Permission {currentPermissions.canEdit && '(Already have)'}
            </span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Extend Expiration (Optional)
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={requestedExpiresAt}
              onChange={(e) => setRequestedExpiresAt(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Increase Max Views (Optional)
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 10"
              value={requestedMaxViews}
              onChange={(e) => setRequestedMaxViews(e.target.value)}
              min={1}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Reason for Request
            </label>
            <textarea
              className="input-field"
              placeholder="Explain why you need this access..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ minHeight: 80, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--body-bg)', display: 'flex', gap: 12 }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (!requestedDownload && !requestedEdit && !requestedExpiresAt && !requestedMaxViews)}
          >
            {submitMutation.isPending ? <Loader2 size={16} className="spin" /> : 'Send Request'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
