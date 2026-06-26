'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ModalPortal from './ModalPortal';
import {
  X, Share2, Copy, Check, Mail, Calendar, Eye, Download, Edit2,
  Loader2, Link as LinkIcon, Lock, AlertCircle, Info, KeyRound,
} from 'lucide-react';
import { shareApi, authApi, filesApi } from '../../lib/api';
import { importPublicKey, loadPrivateKey, rewrapAESKeyForRecipient } from '../../lib/crypto/keyManager';

interface ShareModalProps {
  fileId: string;
  onClose: () => void;
}

export default function ShareModal({ fileId, onClose }: ShareModalProps) {
  const queryClient = useQueryClient();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [ownerPassphrase, setOwnerPassphrase] = useState('');
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [requireOTP, setRequireOTP] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [keyWrapStatus, setKeyWrapStatus] = useState<'idle' | 'wrapping' | 'done' | 'failed'>('idle');

  const shareMutation = useMutation({
    mutationFn: async () => {
      let encryptedKeyForRecipient: string | undefined;

      if (recipientEmail) {
        try {
          const { data: recipientData } = await authApi.getUserByEmail(recipientEmail);
          const recipientPublicKeyJwk = recipientData.user?.publicKey;

          if (recipientPublicKeyJwk) {
            if (!ownerPassphrase) {
              throw new Error('Your master passphrase is required to wrap the encryption key for the recipient.');
            }

            setKeyWrapStatus('wrapping');

            let ownerPrivateKey: CryptoKey | null;
            try {
              ownerPrivateKey = await loadPrivateKey(ownerPassphrase);
            } catch {
              setKeyWrapStatus('failed');
              throw new Error('Wrong master passphrase — could not load your private key.');
            }
            if (!ownerPrivateKey) {
              setKeyWrapStatus('failed');
              throw new Error('No private key found. Please upload a file first to generate your key pair.');
            }

            const { data: fileData } = await filesApi.get(fileId);
            const fileEncryptedKey: string = fileData.file.encryptedKey;

            const recipientPublicKey = await importPublicKey(recipientPublicKeyJwk);

            encryptedKeyForRecipient = await rewrapAESKeyForRecipient(
              fileEncryptedKey,
              ownerPrivateKey,
              recipientPublicKey
            );
            setKeyWrapStatus('done');
          }
        } catch (err: any) {
          setKeyWrapStatus('failed');
          if (
            err.message.includes('master passphrase') ||
            err.message.includes('private key') ||
            err.message.includes('Wrong')
          ) {
            throw err;
          }
          console.warn('Key wrapping skipped:', err.message);
        }
      }

      const { data } = await shareApi.create({
        fileId,
        recipientEmail: recipientEmail || undefined,
        encryptedKeyForRecipient,
        canView,
        canDownload,
        canEdit,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
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

  const needsPassphrase = recipientEmail.trim().length > 0;

  return (
    <ModalPortal onClose={onClose} maxWidth={520}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--green-dim)', border: '1px solid rgba(0,227,155,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Share2 size={18} color="var(--green)" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Share File</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
              Generate a secure share link
            </p>
          </div>
        </div>
        <button id="share-modal-close" onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
      </div>

      {/* ── Generated Link ───────────────────────────────────────────────── */}
      {generatedLink ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{
            padding: '20px', background: 'var(--green-dim)',
            border: '1px solid rgba(0,227,155,0.25)', borderRadius: 14, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Check size={16} color="var(--green)" />
              <span style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>Share link created!</span>
              {keyWrapStatus === 'done' && (
                <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 10 }}>
                  <KeyRound size={9} /> Key wrapped
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                flex: 1, padding: '10px 14px', background: 'rgba(7,17,31,0.5)', borderRadius: 10,
                fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {generatedLink}
              </div>
              <button id="copy-share-link-btn" onClick={copyLink} className="btn-primary" style={{ padding: '10px 16px', flexShrink: 0 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {keyWrapStatus === 'done' && (
              <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 10, opacity: 0.8 }}>
                ✓ The recipient can decrypt this file using their own master passphrase.
              </p>
            )}
            {keyWrapStatus !== 'done' && recipientEmail && (
              <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 10 }}>
                ⚠ Key not wrapped — the recipient cannot decrypt the file. Re-share with your master passphrase to enable decryption.
              </p>
            )}
          </div>
          <button onClick={() => { setGeneratedLink(''); setKeyWrapStatus('idle'); }}
            className="btn-secondary" style={{ width: '100%' }}>
            Create Another Link
          </button>
        </motion.div>
      ) : (
        <>
          {/* ── Recipient Email ────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recipient Email{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — leave blank for public link)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input id="share-recipient-email" type="email" value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com" className="input-field" style={{ paddingLeft: 40, fontSize: 14 }} />
            </div>
          </div>

          {/* ── Owner Passphrase (when emailing) ──────────────────────────── */}
          <AnimatePresence>
            {needsPassphrase && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  padding: '12px 14px', background: 'rgba(0,200,255,0.05)',
                  border: '1px solid rgba(0,200,255,0.15)', borderRadius: 10, marginBottom: 12,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <Info size={14} color="var(--accent)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Sharing to a specific email requires your <strong style={{ color: 'var(--text-primary)' }}>master passphrase</strong> to securely wrap the file's decryption key for the recipient.
                  </p>
                </div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  <Lock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Your Master Passphrase
                </label>
                <input id="share-owner-passphrase" type="password" value={ownerPassphrase}
                  onChange={(e) => setOwnerPassphrase(e.target.value)}
                  placeholder="Enter your master passphrase" className="input-field" style={{ fontSize: 14 }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Permissions ───────────────────────────────────────────────── */}
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
                  <button key={perm.label} id={perm.id}
                    onClick={() => !perm.disabled && perm.setter(!perm.value)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      background: perm.value ? `${perm.color}18` : 'var(--card-bg)',
                      border: `1px solid ${perm.value ? `${perm.color}40` : 'var(--border)'}`,
                      borderRadius: 10, color: perm.value ? perm.color : 'var(--text-secondary)',
                      cursor: perm.disabled ? 'default' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.2s', opacity: perm.disabled ? 0.7 : 1,
                    }}>
                    <Icon size={16} />
                    {perm.label}
                    {perm.disabled && <span style={{ fontSize: 9, opacity: 0.6 }}>always</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Expiry & View Limit ───────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                <Calendar size={12} style={{ marginRight: 4 }} /> Expires at
              </label>
              <input id="share-expiry-input" type="datetime-local" value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)} className="input-field" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                <Eye size={12} style={{ marginRight: 4 }} /> Max Views
              </label>
              <input id="share-max-views-input" type="number" value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)} placeholder="Unlimited"
                className="input-field" style={{ fontSize: 13 }} min="1" />
            </div>
          </div>

          {/* ── OTP Toggle ────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: requireOTP ? 'var(--purple-dim)' : 'var(--card-bg)',
            border: `1px solid ${requireOTP ? 'rgba(139,92,246,0.25)' : 'var(--border)'}`,
            borderRadius: 10, marginBottom: 24, transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Require OTP verification</span>
            <button id="otp-toggle" onClick={() => setRequireOTP(!requireOTP)} style={{
              width: 44, height: 24, borderRadius: 12,
              background: requireOTP ? 'var(--purple)' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}>
              <motion.div animate={{ x: requireOTP ? 20 : 2 }}
                style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
            </button>
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {shareMutation.isError && (
            <div style={{
              display: 'flex', gap: 8, padding: '10px 14px',
              background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, marginBottom: 16,
            }}>
              <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>
                {(shareMutation.error as Error).message}
              </span>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button id="generate-share-link-btn" onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending || (needsPassphrase && !ownerPassphrase)}
            className="btn-primary"
            style={{
              width: '100%', padding: '13px',
              opacity: (shareMutation.isPending || (needsPassphrase && !ownerPassphrase)) ? 0.6 : 1,
              cursor: (shareMutation.isPending || (needsPassphrase && !ownerPassphrase)) ? 'not-allowed' : 'pointer',
            }}>
            {shareMutation.isPending ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                {keyWrapStatus === 'wrapping' ? 'Wrapping key…' : 'Creating link…'}
              </>
            ) : (
              <>
                <LinkIcon size={16} />
                Generate Secure Link
              </>
            )}
          </button>

          {needsPassphrase && !ownerPassphrase && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              Enter your master passphrase above to enable recipient decryption
            </p>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ModalPortal>
  );
}
