import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Loader2, Lock, AlertCircle, Download, Image as ImageIcon, FileText, FileAudio, FileVideo } from 'lucide-react';
import { filesApi } from '../../lib/api';
import { decryptFile, downloadEncryptedFile } from '../../lib/crypto/fileEncryptor';
import { loadPrivateKey } from '../../lib/crypto/keyManager';

interface PreviewModalProps {
  fileId: string;
  onClose: () => void;
}

export default function PreviewModal({ fileId, onClose }: PreviewModalProps) {
  const [step, setStep] = useState<'loading_meta' | 'passphrase' | 'decrypting' | 'preview' | 'error'>('loading_meta');
  const [error, setError] = useState('');
  
  const [fileMeta, setFileMeta] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [layerPassphrases, setLayerPassphrases] = useState<string[]>([]);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch file metadata
    filesApi.get(fileId)
      .then(res => {
        setFileMeta(res.data.file);
        setDownloadUrl(res.data.downloadUrl);
        if (res.data.file.encryptionLayers && res.data.file.encryptionLayers.length > 0) {
          setLayerPassphrases(new Array(res.data.file.encryptionLayers.length).fill(''));
        }
        setStep('passphrase');
      })
      .catch(err => {
        setError('Failed to load file metadata.');
        setStep('error');
      });
      
    return () => {
      // Cleanup object URL on unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileId]);

  const handleDecrypt = async () => {
    if (!masterPassphrase) {
      setError('Master passphrase is required');
      return;
    }
    
    setStep('decrypting');
    setError('');

    try {
      // Load private key
      const privateKey = await loadPrivateKey(masterPassphrase);
      if (!privateKey) {
        throw new Error('Invalid master passphrase or private key not found');
      }

      // Download encrypted file
      const encryptedBuffer = await downloadEncryptedFile(downloadUrl);

      // Prepare layers if any
      const layers = fileMeta.encryptionLayers?.map((layer: any, index: number) => ({
        ...layer,
        passphrase: layerPassphrases[index]
      })) || [];

      // Decrypt
      const decryptedBuffer = await decryptFile(encryptedBuffer, {
        encryptedKeyBase64: fileMeta.encryptedKey,
        ivBase64: fileMeta.iv,
        rsaPrivateKey: privateKey,
        layers
      });

      // Create object URL for preview
      const blob = new Blob([decryptedBuffer], { type: fileMeta.mimeType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setStep('preview');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Decryption failed. Check your passphrases.');
      setStep('passphrase'); // Go back to let them try again
    }
  };

  const renderPreviewContent = () => {
    if (!previewUrl || !fileMeta) return null;
    
    const mime = fileMeta.mimeType.toLowerCase();
    
    if (mime.startsWith('image/')) {
      return <img src={previewUrl} alt={fileMeta.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }} />;
    }
    if (mime.startsWith('video/')) {
      return <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />;
    }
    if (mime.startsWith('audio/')) {
      return <audio src={previewUrl} controls style={{ width: '100%', marginTop: 20 }} />;
    }
    if (mime === 'application/pdf' || mime.startsWith('text/')) {
      return <iframe src={previewUrl} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8, background: '#fff' }} />;
    }
    
    // Fallback for unsupported types
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Download size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Preview not available</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          This file type ({fileMeta.mimeType}) cannot be previewed in the browser.
        </p>
        <a 
          href={previewUrl} 
          download={fileMeta.filename}
          className="btn-primary"
          style={{ textDecoration: 'none' }}
        >
          <Download size={16} /> Download Decrypted File
        </a>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
        }}
      />

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
          maxWidth: step === 'preview' ? 900 : 440,
          zIndex: 1001,
          padding: 24,
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(0,200,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye size={18} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }} className="truncate" title={fileMeta?.filename}>
                {step === 'preview' ? fileMeta?.filename : 'Secure Preview'}
              </h2>
              {fileMeta && step === 'preview' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2, margin: 0 }}>
                  Decrypted on the fly • Never sent to server
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {step === 'loading_meta' && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Fetching metadata...</p>
            </div>
          )}

          {step === 'passphrase' && fileMeta && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Lock size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>End-to-End Encrypted</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Enter your master passphrase to unlock your private key and decrypt this file locally.
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Master Passphrase
                </label>
                <input
                  type="password"
                  value={masterPassphrase}
                  onChange={(e) => setMasterPassphrase(e.target.value)}
                  placeholder="Enter your master passphrase"
                  className="input-field"
                  autoFocus
                />
              </div>

              {fileMeta.encryptionLayers && fileMeta.encryptionLayers.map((layer: any, i: number) => (
                <div key={layer.id} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Layer {layer.order} ({layer.algorithm}) Passphrase
                  </label>
                  <input
                    type="password"
                    value={layerPassphrases[i]}
                    onChange={(e) => {
                      const newVals = [...layerPassphrases];
                      newVals[i] = e.target.value;
                      setLayerPassphrases(newVals);
                    }}
                    placeholder="Enter layer passphrase"
                    className="input-field"
                  />
                </div>
              ))}

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 16 }}>
                  <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
                </div>
              )}

              <button 
                onClick={handleDecrypt}
                className="btn-primary" 
                style={{ width: '100%', marginTop: 8 }}
                disabled={!masterPassphrase}
              >
                <Lock size={16} /> Decrypt & View
              </button>
            </motion.div>
          )}

          {step === 'decrypting' && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <div className="glow-pulse" style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(10px)', opacity: 0.5 }} />
                  <div style={{ width: 64, height: 64, background: 'var(--card-bg)', border: '2px solid var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    <Lock size={24} color="var(--accent)" />
                  </div>
                </div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Decrypting...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Downloading and decrypting in your browser. This might take a moment for large files.
              </p>
            </div>
          )}

          {step === 'preview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              {renderPreviewContent()}
            </motion.div>
          )}

          {step === 'error' && !fileMeta && (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <AlertCircle size={32} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
