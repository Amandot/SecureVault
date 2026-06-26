'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Plus,
  Minus,
  Lock,
  Shield,
  Eye,
  Download,
  Droplets,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';
import { encryptFile, getPassphraseStrength } from '../../../lib/crypto/fileEncryptor';
import { loadPrivateKey, generateKeyPair, exportPublicKey, storePrivateKey, hasStoredPrivateKey } from '../../../lib/crypto/keyManager';
import { useAuth } from '../../../lib/auth/AuthContext';
import { authApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

type Algorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'XChaCha20';

interface LayerConfig {
  algorithm: Algorithm;
  passphrase: string;
  order: number;
}

interface UploadStatus {
  phase: 'idle' | 'encrypting' | 'uploading' | 'saving' | 'done' | 'error';
  progress: number;
  message: string;
}

const ALGO_INFO: Record<Algorithm, { label: string; desc: string; color: string }> = {
  'AES-256-GCM': {
    label: 'AES-256-GCM',
    desc: 'Military-grade symmetric encryption',
    color: 'var(--accent)',
  },
  'ChaCha20-Poly1305': {
    label: 'ChaCha20-Poly1305',
    desc: 'Stream cipher, mobile-optimized',
    color: 'var(--green)',
  },
  XChaCha20: {
    label: 'XChaCha20',
    desc: 'Extended nonce variant — maximum security',
    color: 'var(--purple)',
  },
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { appUser, refreshAppUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [downloadDisabled, setDownloadDisabled] = useState(false);
  const [status, setStatus] = useState<UploadStatus>({
    phase: 'idle',
    progress: 0,
    message: '',
  });

  const strength = getPassphraseStrength(masterPassphrase);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setSelectedFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 500 * 1024 * 1024, // 500 MB
  });

  const addLayer = () => {
    if (layers.length >= 2) return; // Max 2 extra layers (plus AES = 3 total)
    const availableAlgos: Algorithm[] = ['ChaCha20-Poly1305', 'XChaCha20'];
    const used = new Set(layers.map((l) => l.algorithm));
    const next = availableAlgos.find((a) => !used.has(a));
    if (next) {
      setLayers((prev) => [
        ...prev,
        { algorithm: next, passphrase: '', order: prev.length + 2 },
      ]);
    }
  };

  const removeLayer = (index: number) => {
    setLayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedFile || !appUser) return;

    try {
      setStatus({ phase: 'encrypting', progress: 10, message: 'Preparing encryption keys...' });

      // Get or generate RSA key pair
      let privateKey: CryptoKey;

      if (!hasStoredPrivateKey() || !appUser.publicKey) {
        // Master passphrase is required to store the private key locally
        if (!masterPassphrase) {
          setStatus({ phase: 'error', progress: 0, message: 'A master passphrase is required to protect your private key. Please enter one before uploading.' });
          return;
        }

        setStatus({ phase: 'encrypting', progress: 15, message: 'Generating RSA key pair...' });
        const keyPair = await generateKeyPair();
        privateKey = keyPair.privateKey;

        const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

        // Always store the private key encrypted with the master passphrase
        const { exportPrivateKey } = await import('../../../lib/crypto/keyManager');
        const pkcs8 = await exportPrivateKey(privateKey);
        await storePrivateKey(pkcs8, masterPassphrase);

        // Upload public key to backend
        await authApi.updatePublicKey(publicKeyJwk);
        await refreshAppUser();

        // Re-import public key as CryptoKey for encryption
        const { importPublicKey } = await import('../../../lib/crypto/keyManager');
        const publicKey = await importPublicKey(publicKeyJwk);

        setStatus({ phase: 'encrypting', progress: 30, message: 'Encrypting file with AES-256-GCM...' });

        const encryptionResult = await encryptFile(selectedFile, {
          rsaPublicKey: publicKey,
          extraLayers: layers.filter((l) => l.passphrase),
        });

        await doUpload(encryptionResult);
      } else {
        // Use existing public key
        setStatus({ phase: 'encrypting', progress: 20, message: 'Loading public key...' });
        const { importPublicKey } = await import('../../../lib/crypto/keyManager');
        const publicKey = await importPublicKey(appUser.publicKey);

        setStatus({ phase: 'encrypting', progress: 30, message: 'Encrypting file...' });
        const encryptionResult = await encryptFile(selectedFile, {
          rsaPublicKey: publicKey,
          extraLayers: layers.filter((l) => l.passphrase),
        });

        await doUpload(encryptionResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Encryption failed';
      setStatus({ phase: 'error', progress: 0, message: msg });
    }
  };

  const doUpload = async (encryptionResult: Awaited<ReturnType<typeof encryptFile>>) => {
    if (!selectedFile || !appUser) return;

    setStatus({ phase: 'uploading', progress: 55, message: 'Uploading encrypted file to backend...' });

    await filesApi.upload({
      encryptedFile: encryptionResult.encryptedBlob,
      mimeType: selectedFile.type || 'application/octet-stream',
      filename: selectedFile.name,
      size: selectedFile.size,
      encryptionType: encryptionResult.encryptionType,
      encryptedKey: encryptionResult.encryptedKey,
      iv: encryptionResult.iv,
      layerCount: encryptionResult.layerCount,
      watermarkEnabled,
      downloadDisabled,
      layers: encryptionResult.layers.map((l) => ({
        algorithm: l.algorithm,
        order: l.order,
        iv: l.nonce,
      })),
    }, (progressEvent) => {
      const pct = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
      setStatus({
        phase: 'uploading',
        progress: 55 + Math.round(pct * 0.43),
        message: `Uploading... ${pct}%`,
      });
    });

    setStatus({ phase: 'saving', progress: 98, message: 'Finalizing...' });

    queryClient.invalidateQueries({ queryKey: ['files'] });

    setStatus({
      phase: 'done',
      progress: 100,
      message: 'File encrypted and uploaded successfully!',
    });

    // Redirect after 2 seconds
    setTimeout(() => router.push('/dashboard/my-files'), 2000);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Secure Upload
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Your file is encrypted in the browser before upload. We never see your data.
        </p>
      </motion.div>

      {/* ─── Drop Zone ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          {...getRootProps()}
          className={`glass-card ${isDragActive ? 'dropzone-active' : ''}`}
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px dashed var(--border)',
            borderRadius: 20,
            marginBottom: 24,
            transition: 'all 0.3s ease',
            position: 'relative',
          }}
        >
        <input {...getInputProps()} id="file-upload-input" />

        {selectedFile ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(0,200,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 32,
              }}
            >
              {selectedFile.type?.includes('pdf')
                ? '📄'
                : selectedFile.type?.includes('image')
                ? '🖼️'
                : selectedFile.type?.includes('video')
                ? '🎥'
                : '📁'}
            </div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {selectedFile.name}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {formatFileSize(selectedFile.size)} •{' '}
              {selectedFile.type || 'Unknown type'}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              style={{
                marginTop: 16,
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: 'var(--danger)',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <X size={12} /> Remove
            </button>
          </motion.div>
        ) : (
          <motion.div animate={{ scale: isDragActive ? 1.05 : 1 }}>
            <div
              className={isDragActive ? 'glow-pulse' : ''}
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: isDragActive ? 'var(--accent-dim)' : 'var(--card-bg)',
                border: `2px solid ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                transition: 'all 0.3s ease',
              }}
            >
              <Upload size={32} color={isDragActive ? 'var(--accent)' : 'var(--text-muted)'} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
              {isDragActive ? 'Drop your file here' : 'Drag & drop a file to encrypt'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              or click to browse — up to 500 MB
            </p>
            <span className="badge badge-accent">AES-256-GCM encrypted before upload</span>
          </motion.div>
        )}
        </div>
      </motion.div>

      {/* ─── Encryption Settings ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
        style={{ padding: 28, marginBottom: 20 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={18} color="var(--accent)" />
          Encryption Settings
        </h2>

        {/* Layer 1 — AES-256-GCM (always active) */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(0,200,255,0.04)',
            border: '1px solid rgba(0,200,255,0.15)',
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                1
              </span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>AES-256-GCM</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  Military-grade • Always active
                </p>
              </div>
            </div>
            <span className="badge badge-accent">Always On</span>
          </div>
        </div>

        {/* Extra Layers */}
        <AnimatePresence>
          {layers.map((layer, i) => {
            const info = ALGO_INFO[layer.algorithm];
            const s = getPassphraseStrength(layer.passphrase);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 12 }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    background: `${info.color}08`,
                    border: `1px solid ${info.color}20`,
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: `${info.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: info.color,
                        }}
                      >
                        {i + 2}
                      </span>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{info.label}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{info.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLayer(i)}
                      style={{
                        background: 'var(--danger-dim)',
                        border: 'none',
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--danger)',
                      }}
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder={`Passphrase for Layer ${i + 2}`}
                    value={layer.passphrase}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLayers((prev) =>
                        prev.map((l, idx) => (idx === i ? { ...l, passphrase: val } : l))
                      );
                    }}
                    className="input-field"
                    style={{ fontSize: 13 }}
                  />
                  {layer.passphrase && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Strength</span>
                        <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${s.score}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {layers.length < 2 && (
          <button
            onClick={addLayer}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 10,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--accent)';
              el.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--border)';
              el.style.color = 'var(--text-muted)';
            }}
          >
            <Plus size={16} /> Add Encryption Layer
          </button>
        )}

        {/* Master Passphrase (for private key storage) */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
            Master Passphrase{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {hasStoredPrivateKey()
                ? '(your key is stored — enter the same passphrase to decrypt after upload)'
                : '(required — protects your private key · remember this!)'}
            </span>
          </label>
          <input
            id="master-passphrase-input"
            type="password"
            placeholder={hasStoredPrivateKey() ? 'Enter your existing master passphrase' : 'Choose a strong master passphrase'}
            value={masterPassphrase}
            onChange={(e) => setMasterPassphrase(e.target.value)}
            className="input-field"
          />
          {masterPassphrase && (
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${strength.score}%`, background: strength.color }}
                />
              </div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 4, display: 'block' }}>
                {strength.label} passphrase
              </span>
            </div>
          )}
        </div>

      </motion.div>

      {/* ─── Access Controls ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card"
        style={{ padding: 28, marginBottom: 24 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="var(--green)" />
          Access Controls
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              id: 'watermark-toggle',
              icon: Droplets,
              label: 'Dynamic Watermark',
              desc: 'Overlay viewer name, email, time, and IP during preview',
              color: 'var(--warning)',
              value: watermarkEnabled,
              onChange: setWatermarkEnabled,
            },
            {
              id: 'download-disable-toggle',
              icon: Download,
              label: 'Disable Download',
              desc: 'Recipients can only preview, not download the file',
              color: 'var(--danger)',
              value: downloadDisabled,
              onChange: setDownloadDisabled,
            },
          ].map((ctrl) => {
            const Icon = ctrl.icon;
            return (
              <div
                key={ctrl.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: ctrl.value ? `${ctrl.color}08` : 'var(--card-bg)',
                  border: `1px solid ${ctrl.value ? `${ctrl.color}25` : 'var(--border)'}`,
                  borderRadius: 12,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color={ctrl.value ? ctrl.color : 'var(--text-muted)'} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{ctrl.label}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{ctrl.desc}</p>
                  </div>
                </div>
                <button
                  id={ctrl.id}
                  onClick={() => ctrl.onChange(!ctrl.value)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: ctrl.value ? ctrl.color : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <motion.div
                    animate={{ x: ctrl.value ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Upload Status ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {status.phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-card"
            style={{ padding: 24, marginBottom: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {status.phase === 'done' ? (
                <CheckCircle size={20} color="var(--green)" />
              ) : status.phase === 'error' ? (
                <AlertCircle size={20} color="var(--danger)" />
              ) : (
                <Loader2
                  size={20}
                  color="var(--accent)"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              )}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color:
                    status.phase === 'done'
                      ? 'var(--green)'
                      : status.phase === 'error'
                      ? 'var(--danger)'
                      : 'var(--text-primary)',
                }}
              >
                {status.message}
              </span>
            </div>
            {status.phase !== 'error' && (
              <div className="progress-bar">
                <motion.div
                  className="progress-bar-fill"
                  animate={{ width: `${status.progress}%` }}
                  style={{
                    background: status.phase === 'done' ? 'var(--green)' : undefined,
                  }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Upload Button ───────────────────────────────────────────────── */}
      <motion.button
        id="encrypt-upload-btn"
        onClick={handleUpload}
        disabled={!selectedFile || status.phase !== 'idle' && status.phase !== 'error'}
        whileHover={{ scale: selectedFile ? 1.01 : 1 }}
        whileTap={{ scale: selectedFile ? 0.99 : 1 }}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '16px',
          fontSize: 16,
          opacity: !selectedFile ? 0.5 : 1,
          cursor: !selectedFile ? 'not-allowed' : 'pointer',
        }}
      >
        <Lock size={18} />
        Encrypt &amp; Upload Securely
      </motion.button>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Eye size={12} />
        Your plaintext data never leaves your browser
      </p>
    </div>
  );
}
