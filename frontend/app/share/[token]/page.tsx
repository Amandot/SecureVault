'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { use } from 'react';
import {
  Shield, Lock, Eye, Download, AlertCircle, Loader2,
  Copy, Check, File, Clock, User,
} from 'lucide-react';
import { shareApi } from '../../../lib/api';
import { downloadEncryptedFile, decryptFile } from '../../../lib/crypto/fileEncryptor';
import { loadPrivateKey } from '../../../lib/crypto/keyManager';
import type { EncryptionAlgorithm } from '../../../lib/crypto/chacha';
import WatermarkOverlay, { type WatermarkConfig } from '../../../components/WatermarkOverlay';
import SecurePdfViewer from '../../../components/viewer/SecurePdfViewer';
import { useAuth } from '../../../lib/auth/AuthContext';
import AccessRequestModal from '../../../components/modals/AccessRequestModal';

interface ShareData {
  share: {
    id: string;
    canView: boolean;
    canDownload: boolean;
    canEdit: boolean;
    requiresPassword: boolean;
    requireOTP: boolean;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
    encryptedKeyForRecipient: string | null;
  };
  file: {
    id: string;
    filename: string;
    mimeType: string;
    size: string;
    encryptionType: string;
    encryptedKey: string;
    iv: string;
    encryptionLayers: Array<{ id: string; algorithm: string; order: number; iv: string }>;
    watermarkEnabled: boolean;
    downloadDisabled: boolean;
    // Watermark config
    watermarkFields: string;
    watermarkText: string | null;
    watermarkOpacity: number;
    watermarkFontSize: string;
    watermarkRotation: number;
    watermarkPlacement: string;
    watermarkColor: string;
  };
  owner: { name: string; email: string; photo: string | null };
  encryptedFileUrl: string;
  downloadUrl: string | null;
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [step, setStep] = useState<'loading' | 'info' | 'passphrase' | 'decrypting' | 'preview' | 'error'>('loading');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState('');
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [layerPassphrases, setLayerPassphrases] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [decryptedPdfBuffer, setDecryptedPdfBuffer] = useState<ArrayBuffer | Uint8Array | null>(null);
  const [copied, setCopied] = useState(false);
  // Track viewer identity (will be populated once they enter passphrase)
  const [viewerName, setViewerName] = useState('');
  const [viewerEmail, setViewerEmail] = useState('');
  
  const [showAccessModal, setShowAccessModal] = useState(false);
  const { appUser } = useAuth();

  useEffect(() => {
    shareApi.resolve(token)
      .then((res) => {
        setShareData(res.data);
        if (res.data.file.encryptionLayers?.length > 0) {
          setLayerPassphrases(new Array(res.data.file.encryptionLayers.length).fill(''));
        }
        setStep('info');
      })
      .catch((err) => {
        setError(err.message || 'Share link not found or has expired.');
        setStep('error');
      });
  }, [token]);

  const handleDecryptAndView = async () => {
    if (!shareData) return;
    setStep('decrypting');
    setError('');

    try {
      let privateKey: CryptoKey | null = null;
      try {
        privateKey = await loadPrivateKey(masterPassphrase);
      } catch {
        throw new Error('Wrong master passphrase — decryption failed. Please try again.');
      }
      if (!privateKey) {
        throw new Error('No private key found in this browser. You need to be logged in with your account on this device to decrypt files.');
      }

      const encryptedBuffer = await downloadEncryptedFile(shareData.encryptedFileUrl);

      const isValidBase64 = (s: string | null | undefined): boolean => {
        if (!s) return false;
        try { atob(s); return true; } catch { return false; }
      };

      const recipientKey = shareData.share.encryptedKeyForRecipient;
      const ownerKey = shareData.file.encryptedKey;

      let encryptedKeyBase64: string;
      if (isValidBase64(recipientKey)) {
        encryptedKeyBase64 = recipientKey!;
      } else if (isValidBase64(ownerKey)) {
        encryptedKeyBase64 = ownerKey;
      } else {
        throw new Error('No valid encryption key found for this file. Please ask the owner to re-share it.');
      }

      const layers = shareData.file.encryptionLayers?.map((layer, index) => ({
        ...layer,
        algorithm: layer.algorithm as EncryptionAlgorithm,
        nonce: layer.iv,
        passphrase: layerPassphrases[index] || '',
      })) || [];

      let decryptedBuffer: ArrayBuffer;
      try {
        decryptedBuffer = await decryptFile(encryptedBuffer, {
          encryptedKeyBase64,
          ivBase64: shareData.file.iv,
          rsaPrivateKey: privateKey,
          layers,
        });
      } catch {
        throw new Error(
          'Decryption failed. Make sure you are entering YOUR master passphrase and that the file was shared directly to your email.'
        );
      }

      if (shareData.file.mimeType === 'application/pdf') {
        setDecryptedPdfBuffer(decryptedBuffer);
      } else {
        const blob = new Blob([decryptedBuffer], { type: shareData.file.mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Decryption failed. Check your passphrase.');
      setStep('passphrase');
    }
  };



  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build watermark config from share file metadata
  const watermarkConfig: WatermarkConfig | null = shareData?.file.watermarkEnabled
    ? {
        fields: (() => { try { return JSON.parse(shareData.file.watermarkFields || '[]'); } catch { return []; } })(),
        customText: shareData.file.watermarkText || null,
        opacity: shareData.file.watermarkOpacity ?? 50,
        fontSize: (shareData.file.watermarkFontSize as 'small' | 'medium' | 'large') ?? 'medium',
        rotation: shareData.file.watermarkRotation ?? 45,
        placement: (shareData.file.watermarkPlacement as any) ?? 'diagonal',
        color: (shareData.file.watermarkColor as any) ?? 'white',
      }
    : null;

  const viewerInfo = {
    name: viewerName || 'Viewer',
    email: viewerEmail || undefined,
  };

  const downloadDisabled = shareData?.file.downloadDisabled ?? false;
  const canActuallyDownload = shareData?.share.canDownload && !downloadDisabled;

  const blockRight = (e: React.MouseEvent) => { if (downloadDisabled) e.preventDefault(); };

  const renderPreview = () => {
    if (!previewUrl || !shareData) return null;
    const mime = shareData.file.mimeType.toLowerCase();

    if (mime.startsWith('image/')) {
      return (
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '70vh' }}>
          <img src={previewUrl} alt={shareData.file.filename}
            onContextMenu={blockRight}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />
          {watermarkConfig && <WatermarkOverlay config={watermarkConfig} viewer={viewerInfo} />}
        </div>
      );
    }
    if (mime.startsWith('video/')) {
      return (
        <div style={{ position: 'relative', maxWidth: '100%' }}>
          <video src={previewUrl} controls
            controlsList={downloadDisabled ? 'nodownload' : undefined}
            onContextMenu={blockRight}
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, display: 'block' }} />
          {watermarkConfig && <WatermarkOverlay config={watermarkConfig} viewer={viewerInfo} />}
        </div>
      );
    }
    if (mime.startsWith('audio/')) {
      return <audio src={previewUrl} controls controlsList={downloadDisabled ? 'nodownload' : undefined} style={{ width: '100%' }} />;
    }
    if (mime.startsWith('text/')) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '70vh' }}>
          <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, background: '#fff' }} />
          {watermarkConfig && <WatermarkOverlay config={watermarkConfig} viewer={viewerInfo} />}
        </div>
      );
    }
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <File size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Preview not available for this file type.</p>
        {canActuallyDownload && (
          <a href={previewUrl} download={shareData.file.filename} className="btn-primary" style={{ textDecoration: 'none' }}>
            <Download size={16} /> Download Decrypted File
          </a>
        )}
      </div>
    );
  };

  if (step === 'preview' && shareData?.file.mimeType === 'application/pdf' && decryptedPdfBuffer) {
    return (
      <SecurePdfViewer
        pdfBuffer={decryptedPdfBuffer}
        filename={shareData.file.filename}
        canDownload={!!canActuallyDownload}
        watermarkConfig={watermarkConfig}
        viewerInfo={viewerInfo}
        onClose={() => setStep('info')}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: step === 'preview' ? 'flex-start' : 'center', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,200,255,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header brand */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32, zIndex: 1, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #0099cc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#000" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>SecureVault</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>End-to-end encrypted file sharing</p>
      </motion.div>

      {/* ─── Loading ─── */}
      {step === 'loading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', zIndex: 1 }}>
          <Loader2 size={40} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Resolving share link...</p>
        </motion.div>
      )}

      {/* ─── Error ─── */}
      {step === 'error' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card"
          style={{ padding: 40, maxWidth: 440, width: '100%', textAlign: 'center', zIndex: 1 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={28} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Link Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        </motion.div>
      )}

      {/* ─── Info + Passphrase ─── */}
      {(step === 'info' || step === 'passphrase') && shareData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card"
          style={{ padding: 32, maxWidth: 480, width: '100%', zIndex: 1 }}>
          {/* File card */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px', background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.12)', borderRadius: 14, marginBottom: 24 }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{getFileEmoji(shareData.file.mimeType)}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p className="truncate" style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }} title={shareData.file.filename}>{shareData.file.filename}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatSize(parseInt(shareData.file.size))} • {shareData.file.encryptionType}</p>
            </div>
            <span className="badge badge-accent" style={{ flexShrink: 0 }}><Lock size={9} /> Encrypted</span>
          </div>

          {/* Owner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(0,200,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {shareData.owner.photo ? <img src={shareData.owner.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={14} color="var(--accent)" />}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Shared by <strong style={{ color: 'var(--text-primary)' }}>{shareData.owner.name}</strong>
            </span>
            {shareData.share.expiresAt && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--warning)' }}>
                <Clock size={11} /> Expires {new Date(shareData.share.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Permissions + restrictions */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {shareData.share.canView && <span className="badge badge-accent"><Eye size={9} /> View</span>}
            {canActuallyDownload && <span className="badge badge-green"><Download size={9} /> Download</span>}
            {downloadDisabled && <span className="badge badge-danger">Download Disabled</span>}
            {shareData.file.watermarkEnabled && <span className="badge badge-warning">Watermarked</span>}
          </div>

          {/* E2E notice */}
          <div style={{ padding: '12px 16px', background: 'rgba(0,227,155,0.06)', border: '1px solid rgba(0,227,155,0.15)', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Shield size={15} color="var(--green)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This file is end-to-end encrypted. Enter your <strong style={{ color: 'var(--text-primary)' }}>master passphrase</strong> to decrypt it locally in your browser. The decrypted content is never sent to any server.
            </p>
          </div>

          {/* Viewer identity (for watermark) */}
          {shareData.file.watermarkEnabled && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 10 }}>📋 Watermark Info — This document will be watermarked with your details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="text" placeholder="Your name" value={viewerName} onChange={e => setViewerName(e.target.value)} className="input-field" style={{ fontSize: 12, padding: '8px 12px' }} />
                <input type="email" placeholder="Your email" value={viewerEmail} onChange={e => setViewerEmail(e.target.value)} className="input-field" style={{ fontSize: 12, padding: '8px 12px' }} />
              </div>
            </div>
          )}

          {/* Master passphrase */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Your Master Passphrase</label>
            <input id="share-master-passphrase" type="password" value={masterPassphrase}
              onChange={(e) => setMasterPassphrase(e.target.value)}
              placeholder="Enter your master passphrase" className="input-field" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && masterPassphrase && handleDecryptAndView()} />
          </div>

          {/* Extra layer passphrases */}
          {shareData.file.encryptionLayers?.map((layer, i) => (
            <div key={layer.id} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Layer {layer.order} ({layer.algorithm}) Passphrase
              </label>
              <input type="password" value={layerPassphrases[i] || ''}
                onChange={(e) => { const next = [...layerPassphrases]; next[i] = e.target.value; setLayerPassphrases(next); }}
                placeholder="Enter layer passphrase" className="input-field" />
            </div>
          ))}

          {/* Error */}
          {error && step === 'passphrase' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 16 }}>
              <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            <button id="decrypt-view-btn" onClick={handleDecryptAndView} disabled={!masterPassphrase} className="btn-primary"
              style={{ width: '100%', padding: '13px', opacity: !masterPassphrase ? 0.5 : 1, cursor: !masterPassphrase ? 'not-allowed' : 'pointer' }}>
              <Lock size={16} /> Decrypt &amp; View
            </button>
            <button onClick={copyLink} className="btn-secondary" style={{ width: '100%' }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Share Link'}
            </button>
            {appUser && (
              <button onClick={() => setShowAccessModal(true)} className="btn-ghost" style={{ width: '100%' }}>
                Request More Access
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Decrypting ─── */}
      {step === 'decrypting' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card"
          style={{ padding: 48, maxWidth: 380, width: '100%', textAlign: 'center', zIndex: 1 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            <div className="glow-pulse" style={{ position: 'absolute', inset: -8, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(14px)', opacity: 0.4 }} />
            <div style={{ width: 72, height: 72, background: 'var(--card-bg)', border: '2px solid var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              <Lock size={28} color="var(--accent)" />
            </div>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Decrypting File…</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Downloading and decrypting in your browser. This may take a moment for large files.</p>
        </motion.div>
      )}

      {/* ─── Preview ─── */}
      {step === 'preview' && shareData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 1000, zIndex: 1 }}>
          {/* Preview header bar */}
          <div className="glass-card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22 }}>{getFileEmoji(shareData.file.mimeType)}</span>
            <div style={{ flex: 1 }}>
              <p className="truncate" style={{ fontWeight: 600, fontSize: 15 }}>{shareData.file.filename}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Decrypted locally · {formatSize(parseInt(shareData.file.size))}
                {downloadDisabled && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>• Download disabled</span>}
                {shareData.file.watermarkEnabled && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>• Watermarked</span>}
              </p>
            </div>
            <span className="badge badge-green"><Shield size={9} /> Decrypted</span>
            {canActuallyDownload && previewUrl && (
              <a href={previewUrl} download={shareData.file.filename} className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
                <Download size={14} /> Download
              </a>
            )}
            {appUser && (
              <button onClick={() => setShowAccessModal(true)} className="btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}>
                Request Access
              </button>
            )}
          </div>

          {/* Preview content */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            {renderPreview()}
          </div>
        </motion.div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <AnimatePresence>
        {showAccessModal && shareData && (
          <AccessRequestModal
            fileId={shareData.file.id}
            shareId={shareData.share.id}
            onClose={() => setShowAccessModal(false)}
            currentPermissions={{
              canDownload: !!canActuallyDownload,
              canEdit: shareData.share.canEdit,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
