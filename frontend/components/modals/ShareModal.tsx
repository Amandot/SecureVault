'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Share2, Copy, Check, Mail, Calendar, Eye, Download, Edit2, Loader2, Link as LinkIcon } from 'lucide-react';
import { shareApi, authApi } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import { importPublicKey, wrapAESKey } from '../../lib/crypto/keyManager';
import { filesApi } from '../../lib/api';

interface ShareModalProps {
  fileId: string;
  onClose: () => void;
}

export default function ShareModal({ fileId, onClose }: ShareModalProps) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [requireOTP, setRequireOTP] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: async () => {
      let encryptedKeyForRecipient: string | undefined;

      // If recipient email provided, wrap the file's AES key for them
      if (recipientEmail) {
        try {
          const { data: recipientData } = await authApi.getUserByEmail(recipientEmail);
          if (recipientData.user?.publicKey) {
            // Get the file's encrypted key
            const { data: fileData } = await filesApi.get(fileId);
            // We need to re-encrypt the AES key for the recipient
            // This requires the owner to decrypt it first and re-wrap
            // In practice this involves the owner's private key — simplified here
            // For demo, we pass the public key wrapping step
            const recipientPublicKey = await importPublicKey(recipientData.user.publicKey);
            // Note: In production, owner decrypts their AES key first, then wraps for recipient
            // Here we demonstrate the API call structure
            encryptedKeyForRecipient = 're-wrapped-key-placeholder';
          }
        } catch {
          // Recipient not registered — share by link only
        }
      }

      const { data } = await shareApi.create({
        fileId,
        recipientEmail: recipientEmail || undefined,
        encryptedKeyForRecipient,
        canView,
        canDownload,
        canEdit,
        expiresAt: expiresAt || undefined,
        maxViews: maxViews ? parseInt(maxViews) : undefined,
        requireOTP,
      });

      return data;
    },
    onSuccess: (data) => {
      setGeneratedLink(data.shareLink);
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 520,
          zIndex: 101,
          padding: 32,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--green-dim)',
                border: '1px solid rgba(0,227,155,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={18} color="var(--green)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Share File</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                Generate a secure share link
              </p>
            </div>
          </div>
          <button
            id="share-modal-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Generated Link */}
        {generatedLink ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div
              style={{
                padding: '20px',
                background: 'var(--green-dim)',
                border: '1px solid rgba(0,227,155,0.25)',
                borderRadius: 14,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Check size={16} color="var(--green)" />
                <span style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>
                  Share link created!
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'rgba(7,17,31,0.5)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {generatedLink}
                </div>
                <button
                  id="copy-share-link-btn"
                  onClick={copyLink}
                  className="btn-primary"
                  style={{ padding: '10px 16px', flexShrink: 0 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button onClick={() => setGeneratedLink('')} className="btn-secondary" style={{ width: '100%' }}>
              Create Another Link
            </button>
          </motion.div>
        ) : (
          <>
            {/* Recipient Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Recipient Email{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — leave blank for public link)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="share-recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="input-field"
                  style={{ paddingLeft: 40, fontSize: 14 }}
                />
              </div>
            </div>

            {/* Permissions */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
                Permissions
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'perm-view', icon: Eye, label: 'View', value: canView, setter: setCanView, color: 'var(--accent)', disabled: true },
                  { id: 'perm-download', icon: Download, label: 'Download', value: canDownload, setter: setCanDownload, color: 'var(--green)', disabled: false },
                  { id: 'perm-edit', icon: Edit2, label: 'Edit', value: canEdit, setter: setCanEdit, color: 'var(--purple)', disabled: false },
                ].map((perm) => {
                  const Icon = perm.icon;
                  return (
                    <button
                      key={perm.label}
                      id={perm.id}
                      onClick={() => !perm.disabled && perm.setter(!perm.value)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: perm.value ? `${perm.color}18` : 'var(--card-bg)',
                        border: `1px solid ${perm.value ? `${perm.color}40` : 'var(--border)'}`,
                        borderRadius: 10,
                        color: perm.value ? perm.color : 'var(--text-secondary)',
                        cursor: perm.disabled ? 'default' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s',
                        opacity: perm.disabled ? 0.7 : 1,
                      }}
                    >
                      <Icon size={16} />
                      {perm.label}
                      {perm.disabled && <span style={{ fontSize: 9, opacity: 0.6 }}>always</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expiry & View Limit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  <Calendar size={12} style={{ marginRight: 4 }} />
                  Expires at
                </label>
                <input
                  id="share-expiry-input"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="input-field"
                  style={{ fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  <Eye size={12} style={{ marginRight: 4 }} />
                  Max Views
                </label>
                <input
                  id="share-max-views-input"
                  type="number"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="Unlimited"
                  className="input-field"
                  style={{ fontSize: 13 }}
                  min="1"
                />
              </div>
            </div>

            {/* OTP toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: requireOTP ? 'var(--purple-dim)' : 'var(--card-bg)',
                border: `1px solid ${requireOTP ? 'rgba(139,92,246,0.25)' : 'var(--border)'}`,
                borderRadius: 10,
                marginBottom: 24,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>Require OTP verification</span>
              <button
                id="otp-toggle"
                onClick={() => setRequireOTP(!requireOTP)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: requireOTP ? 'var(--purple)' : 'var(--border)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <motion.div
                  animate={{ x: requireOTP ? 20 : 2 }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
              </button>
            </div>

            {/* Submit */}
            <button
              id="generate-share-link-btn"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="btn-primary"
              style={{ width: '100%', padding: '13px' }}
            >
              {shareMutation.isPending ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <LinkIcon size={16} />
                  Generate Secure Link
                </>
              )}
            </button>

            {shareMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                {(shareMutation.error as Error).message}
              </p>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}
