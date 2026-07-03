'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  CheckCircle,
  AlertCircle,
  Loader2,
  Stamp,
  Ban,
  Info,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';
import { encryptFile, getPassphraseStrength } from '../../../lib/crypto/fileEncryptor';
import {
  generateKeyPair,
  exportPublicKey,
  storePrivateKey,
  hasStoredPrivateKey,
  downloadKeyBackup,
  getPrivateKeyDiagnostics,
  resolveEncryptionKeyPair,
} from '../../../lib/crypto/keyManager';
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

// ── Watermark types ──────────────────────────────────────────────────────────
type WatermarkField = 'classification' | 'name' | 'email' | 'date' | 'time' | 'company' | 'custom';
type WatermarkPlacement = 'diagonal' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left' | 'center';
type WatermarkColor = 'white' | 'gray' | 'lightblue' | 'red';
type WatermarkFontSize = 'small' | 'medium' | 'large';

interface WatermarkConfig {
  fields: WatermarkField[];
  customText: string;
  opacity: number;
  fontSize: WatermarkFontSize;
  rotation: number;
  placement: WatermarkPlacement;
  color: WatermarkColor;
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  fields: ['classification', 'name', 'email', 'date'],
  customText: '',
  opacity: 50,
  fontSize: 'medium',
  rotation: 45,
  placement: 'diagonal',
  color: 'white',
};

const ALGO_INFO: Record<Algorithm, { label: string; desc: string; color: string }> = {
  'AES-256-GCM': { label: 'AES-256-GCM', desc: 'Military-grade symmetric encryption', color: 'var(--accent)' },
  'ChaCha20-Poly1305': { label: 'ChaCha20-Poly1305', desc: 'Stream cipher, mobile-optimized', color: 'var(--green)' },
  XChaCha20: { label: 'XChaCha20', desc: 'Extended nonce variant — maximum security', color: 'var(--purple)' },
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Watermark preview mini-canvas ────────────────────────────────────────────
const COLOR_MAP: Record<WatermarkColor, string> = {
  white: 'rgba(255,255,255,',
  gray: 'rgba(180,180,190,',
  lightblue: 'rgba(100,200,255,',
  red: 'rgba(239,68,68,',
};
const FONT_SIZE_MAP: Record<WatermarkFontSize, number> = { small: 9, medium: 11, large: 14 };

function WatermarkPreviewCanvas({ config }: { config: WatermarkConfig }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0e1728';
    ctx.fillRect(0, 0, w, h);

    const fontSize = FONT_SIZE_MAP[config.fontSize];
    const colorBase = COLOR_MAP[config.color] ?? COLOR_MAP.white;
    const alpha = (config.opacity / 100).toFixed(2);
    const fillColor = `${colorBase}${alpha})`;

    const sampleLines: string[] = [];
    if (config.fields.includes('classification')) sampleLines.push('CONFIDENTIAL');
    if (config.fields.includes('name')) sampleLines.push('Viewed by: John Doe');
    if (config.fields.includes('email')) sampleLines.push('john@example.com');
    if (config.fields.includes('date')) sampleLines.push('27 June 2026');
    if (config.fields.includes('time')) sampleLines.push('15:32 IST');
    if ((config.fields.includes('company') || config.fields.includes('custom')) && config.customText) sampleLines.push(config.customText);
    if (sampleLines.length === 0) return;

    const lineH = fontSize * 1.55;
    const blockH = sampleLines.length * lineH;

    const drawBlock = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((config.rotation * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      sampleLines.forEach((line, i) => {
        const y = (i - (sampleLines.length - 1) / 2) * lineH;
        ctx.font = i === 0 && config.fields.includes('classification')
          ? `800 ${fontSize + 1}px Inter, sans-serif`
          : `600 ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = fillColor;
        ctx.fillText(line, 0, y);
      });
      ctx.restore();
    };

    if (config.placement === 'diagonal') {
      const tileW = 130, tileH = blockH + 20;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((-config.rotation * Math.PI) / 180);
      for (let r = -3; r <= 3; r++) {
        for (let c = -3; c <= 3; c++) {
          drawBlock(c * tileW + (r % 2 === 0 ? 0 : tileW / 2), r * tileH);
        }
      }
      ctx.restore();
    } else {
      const pad = 14;
      let cx = w / 2, cy = h / 2;
      switch (config.placement) {
        case 'top-left':     cx = pad + 50; cy = pad + blockH / 2; break;
        case 'top-right':    cx = w - pad - 50; cy = pad + blockH / 2; break;
        case 'bottom-right': cx = w - pad - 50; cy = h - pad - blockH / 2; break;
        case 'bottom-left':  cx = pad + 50; cy = h - pad - blockH / 2; break;
        default: break;
      }
      drawBlock(cx, cy);
    }
  }, [config]);

  return (
    <canvas ref={ref} width={280} height={140}
      style={{ borderRadius: 10, border: '1px solid var(--border)', width: '100%', display: 'block' }} />
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ id, value, onChange, color = 'var(--accent)' }: {
  id: string; value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button id={id} onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      style={{ width: 44, height: 24, borderRadius: 12, background: value ? color : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <motion.div animate={{ x: value ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

// ── Chip selector ─────────────────────────────────────────────────────────────
function ChipGroup<T extends string>({ options, value, onChange, multi = false }: {
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (v: T | T[]) => void;
  multi?: boolean;
}) {
  const selected = multi ? (value as T[]) : [value as T];
  const toggle = (v: T) => {
    if (multi) {
      const arr = value as T[];
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const active = selected.includes(opt.value);
        return (
          <button key={opt.value} onClick={() => toggle(opt.value)}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, color: active ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>
            {active && multi && <span style={{ marginRight: 4 }}>✓</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { appUser, refreshAppUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [status, setStatus] = useState<UploadStatus>({ phase: 'idle', progress: 0, message: '' });
  // True after a new key pair is generated — prompts user to save backup
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // Access controls
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(DEFAULT_WATERMARK);
  const [downloadDisabled, setDownloadDisabled] = useState(false);

  const strength = getPassphraseStrength(masterPassphrase);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setSelectedFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, maxSize: 500 * 1024 * 1024 });

  const addLayer = () => {
    if (layers.length >= 2) return;
    const availableAlgos: Algorithm[] = ['ChaCha20-Poly1305', 'XChaCha20'];
    const used = new Set(layers.map(l => l.algorithm));
    const next = availableAlgos.find(a => !used.has(a));
    if (next) setLayers(prev => [...prev, { algorithm: next, passphrase: '', order: prev.length + 2 }]);
  };

  const removeLayer = (index: number) => setLayers(prev => prev.filter((_, i) => i !== index));
  const updateWatermark = (patch: Partial<WatermarkConfig>) => setWatermarkConfig(prev => ({ ...prev, ...patch }));

  const handleUpload = async () => {
    if (!selectedFile || !appUser) return;
    try {
      setStatus({ phase: 'encrypting', progress: 10, message: 'Preparing encryption keys...' });

      if (!hasStoredPrivateKey() && appUser.publicKey) {
        setStatus({
          phase: 'error',
          progress: 0,
          message:
            'Private key missing on this device. Please import your key backup in Settings before uploading.',
        });
        return;
      }

      let rsaPublicKey: CryptoKey;

      if (!hasStoredPrivateKey()) {
        if (!masterPassphrase) {
          setStatus({
            phase: 'error',
            progress: 0,
            message: 'A master passphrase is required to protect your private key.',
          });
          return;
        }
        setStatus({ phase: 'encrypting', progress: 15, message: 'Generating RSA key pair...' });
        const keyPair = await generateKeyPair();
        const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
        const { exportPrivateKey } = await import('../../../lib/crypto/keyManager');
        const pkcs8 = await exportPrivateKey(keyPair.privateKey);
        await storePrivateKey(pkcs8, masterPassphrase, publicKeyJwk);
        await authApi.updatePublicKey(publicKeyJwk);
        await refreshAppUser();
        if (process.env.NODE_ENV === 'development') {
          console.log('[SecureVault] New key pair generated. Diagnostics:', getPrivateKeyDiagnostics());
        }
        rsaPublicKey = keyPair.publicKey;
      } else {
        if (!masterPassphrase) {
          setStatus({
            phase: 'error',
            progress: 0,
            message: 'Enter your master passphrase to encrypt with your key pair.',
          });
          return;
        }
        setStatus({ phase: 'encrypting', progress: 20, message: 'Unlocking your key pair...' });
        const { publicKey, publicKeyJwk } = await resolveEncryptionKeyPair(
          masterPassphrase,
          appUser.publicKey
        );
        rsaPublicKey = publicKey;
        if (appUser.publicKey !== publicKeyJwk) {
          await authApi.updatePublicKey(publicKeyJwk);
          await refreshAppUser();
        }
      }

      setStatus({ phase: 'encrypting', progress: 30, message: 'Encrypting file with AES-256-GCM...' });
      const encResult = await encryptFile(selectedFile, {
        rsaPublicKey,
        extraLayers: layers.filter((l) => l.passphrase),
      });
      await doUpload(encResult);
    } catch (err: unknown) {
      setStatus({
        phase: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Encryption failed',
      });
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
      watermarkFields: JSON.stringify(watermarkConfig.fields),
      watermarkText: watermarkConfig.customText || undefined,
      watermarkOpacity: watermarkConfig.opacity,
      watermarkFontSize: watermarkConfig.fontSize,
      watermarkRotation: watermarkConfig.rotation,
      watermarkPlacement: watermarkConfig.placement,
      watermarkColor: watermarkConfig.color,
      layers: encryptionResult.layers.map(l => ({ algorithm: l.algorithm, order: l.order, iv: l.nonce })),
    }, (progressEvent) => {
      const pct = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
      setStatus({ phase: 'uploading', progress: 55 + Math.round(pct * 0.43), message: `Uploading... ${pct}%` });
    });

    setStatus({ phase: 'saving', progress: 98, message: 'Finalizing...' });
    queryClient.invalidateQueries({ queryKey: ['files'] });
    setStatus({ phase: 'done', progress: 100, message: 'File encrypted and uploaded successfully!' });
    setTimeout(() => router.push('/dashboard/my-files'), 2000);
  };

  const needsCustomText = watermarkConfig.fields.includes('company') || watermarkConfig.fields.includes('custom');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Secure Upload</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Your file is encrypted in the browser before upload. We never see your data.</p>
      </motion.div>

      {/* ─── Drop Zone ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div {...getRootProps()} className={`glass-card ${isDragActive ? 'dropzone-active' : ''}`}
          style={{ padding: '60px 40px', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--border)', borderRadius: 20, marginBottom: 24, transition: 'all 0.3s ease', position: 'relative' }}>
          <input {...getInputProps()} id="file-upload-input" />
          {selectedFile ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-dim)', border: '1px solid rgba(0,200,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
                {selectedFile.type?.includes('pdf') ? '📄' : selectedFile.type?.includes('image') ? '🖼️' : selectedFile.type?.includes('video') ? '🎥' : '📁'}
              </div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{selectedFile.name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                style={{ marginTop: 16, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--danger)', padding: '6px 14px', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <X size={12} /> Remove
              </button>
            </motion.div>
          ) : (
            <motion.div animate={{ scale: isDragActive ? 1.05 : 1 }}>
              <div className={isDragActive ? 'glow-pulse' : ''} style={{ width: 72, height: 72, borderRadius: 18, background: isDragActive ? 'var(--accent-dim)' : 'var(--card-bg)', border: `2px solid ${isDragActive ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', transition: 'all 0.3s ease' }}>
                <Upload size={32} color={isDragActive ? 'var(--accent)' : 'var(--text-muted)'} />
              </div>
              <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{isDragActive ? 'Drop your file here' : 'Drag & drop a file to encrypt'}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>or click to browse — up to 500 MB</p>
              <span className="badge badge-accent">AES-256-GCM encrypted before upload</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ─── Encryption Settings ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={18} color="var(--accent)" /> Encryption Settings
        </h2>

        {/* Layer 1 — always on */}
        <div style={{ padding: '16px 20px', background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.15)', borderRadius: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>1</span>
              <div><p style={{ fontWeight: 600, fontSize: 14 }}>AES-256-GCM</p><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Military-grade • Always active</p></div>
            </div>
            <span className="badge badge-accent">Always On</span>
          </div>
        </div>

        {/* Extra layers */}
        <AnimatePresence>
          {layers.map((layer, i) => {
            const info = ALGO_INFO[layer.algorithm];
            const s = getPassphraseStrength(layer.passphrase);
            return (
              <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: 12 }}>
                <div style={{ padding: '16px 20px', background: `${info.color}08`, border: `1px solid ${info.color}20`, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: `${info.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: info.color }}>{i + 2}</span>
                      <div><p style={{ fontWeight: 600, fontSize: 14 }}>{info.label}</p><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{info.desc}</p></div>
                    </div>
                    <button onClick={() => removeLayer(i)} style={{ background: 'var(--danger-dim)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }}>
                      <Minus size={14} />
                    </button>
                  </div>
                  <input type="password" placeholder={`Passphrase for Layer ${i + 2}`} value={layer.passphrase}
                    onChange={(e) => { const val = e.target.value; setLayers(prev => prev.map((l, idx) => idx === i ? { ...l, passphrase: val } : l)); }}
                    className="input-field" style={{ fontSize: 13 }} />
                  {layer.passphrase && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Strength</span>
                        <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
                      </div>
                      <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${s.score}%`, background: s.color }} /></div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {layers.length < 2 && (
          <button onClick={addLayer}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}>
            <Plus size={16} /> Add Encryption Layer
          </button>
        )}

        {/* Master passphrase */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
            Master Passphrase{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {hasStoredPrivateKey()
                ? '(required to unlock your key pair for encryption)'
                : '(required — protects your private key · remember this!)'}
            </span>
          </label>
          <input id="master-passphrase-input" type="password"
            placeholder={hasStoredPrivateKey() ? 'Enter your existing master passphrase' : 'Choose a strong master passphrase'}
            value={masterPassphrase} onChange={(e) => setMasterPassphrase(e.target.value)} className="input-field" />
          {masterPassphrase && (
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${strength.score}%`, background: strength.color }} /></div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 4, display: 'block' }}>{strength.label} passphrase</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Access Controls ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="var(--green)" /> Access Controls
        </h2>

        {/* ── Disable Download ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div onClick={() => setDownloadDisabled(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: downloadDisabled ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${downloadDisabled ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, borderRadius: downloadDisabled ? '12px 12px 0 0' : 12, transition: 'all 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: downloadDisabled ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <Ban size={16} color={downloadDisabled ? 'var(--danger)' : 'var(--text-muted)'} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: downloadDisabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Disable Download</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Block recipients from downloading the file</p>
              </div>
            </div>
            <Toggle id="download-disable-toggle" value={downloadDisabled} onChange={setDownloadDisabled} color="var(--danger)" />
          </div>
          <AnimatePresence>
            {downloadDisabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderTop: 'none', borderRadius: '0 0 12px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Info size={14} color="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Recipients can <strong style={{ color: 'var(--text-primary)' }}>preview</strong> the document but <strong style={{ color: 'var(--danger)' }}>cannot download</strong> the encrypted file. The backend enforces this — direct API calls return HTTP 403.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Dynamic Watermark ─────────────────────────────────────────── */}
        <div>
          <div onClick={() => setWatermarkEnabled(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: watermarkEnabled ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${watermarkEnabled ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`, borderRadius: watermarkEnabled ? '12px 12px 0 0' : 12, transition: 'all 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: watermarkEnabled ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <Stamp size={16} color={watermarkEnabled ? 'var(--warning)' : 'var(--text-muted)'} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: watermarkEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Dynamic Watermark</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Overlay viewer info on every preview</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {watermarkEnabled && <span className="badge badge-warning" style={{ fontSize: 10 }}>Active</span>}
              <Toggle id="watermark-toggle" value={watermarkEnabled} onChange={setWatermarkEnabled} color="var(--warning)" />
            </div>
          </div>

          <AnimatePresence>
            {watermarkEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px', background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.15)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

                  {/* Fields */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Watermark Content</label>
                    <ChipGroup<WatermarkField> multi
                      options={[
                        { value: 'classification', label: 'Document Classification' },
                        { value: 'name', label: 'Viewer Name' },
                        { value: 'email', label: 'Viewer Email' },
                        { value: 'date', label: 'Current Date' },
                        { value: 'time', label: 'Current Time' },
                        { value: 'company', label: 'Company Name' },
                        { value: 'custom', label: 'Custom Text' },
                      ]}
                      value={watermarkConfig.fields}
                      onChange={v => updateWatermark({ fields: v as WatermarkField[] })}
                    />
                  </div>

                  {/* Custom text */}
                  <AnimatePresence>
                    {needsCustomText && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 18 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                          {watermarkConfig.fields.includes('company') ? 'Company Name' : 'Custom Text'}
                        </label>
                        <input type="text"
                          placeholder={watermarkConfig.fields.includes('company') ? 'e.g. Acme Corp' : 'e.g. Internal Use Only'}
                          value={watermarkConfig.customText} onChange={e => updateWatermark({ customText: e.target.value })}
                          className="input-field" style={{ fontSize: 13 }} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 2-column settings grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Opacity</label>
                      <ChipGroup options={[{ value: '25', label: '25%' }, { value: '50', label: '50%' }, { value: '75', label: '75%' }, { value: '90', label: '90%' }]}
                        value={String(watermarkConfig.opacity)} onChange={v => updateWatermark({ opacity: parseInt(v as string) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Font Size</label>
                      <ChipGroup<WatermarkFontSize> options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
                        value={watermarkConfig.fontSize} onChange={v => updateWatermark({ fontSize: v as WatermarkFontSize })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Rotation</label>
                      <ChipGroup options={[{ value: '30', label: '30°' }, { value: '45', label: '45°' }, { value: '60', label: '60°' }]}
                        value={String(watermarkConfig.rotation)} onChange={v => updateWatermark({ rotation: parseInt(v as string) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
                      <ChipGroup<WatermarkColor> options={[{ value: 'white', label: 'White' }, { value: 'gray', label: 'Gray' }, { value: 'lightblue', label: 'Light Blue' }, { value: 'red', label: 'Red' }]}
                        value={watermarkConfig.color} onChange={v => updateWatermark({ color: v as WatermarkColor })} />
                    </div>
                  </div>

                  {/* Placement */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Placement</label>
                    <ChipGroup<WatermarkPlacement>
                      options={[
                        { value: 'diagonal', label: 'Repeated Diagonal' },
                        { value: 'center', label: 'Center' },
                        { value: 'top-left', label: 'Top Left' },
                        { value: 'top-right', label: 'Top Right' },
                        { value: 'bottom-left', label: 'Bottom Left' },
                        { value: 'bottom-right', label: 'Bottom Right' },
                      ]}
                      value={watermarkConfig.placement}
                      onChange={v => updateWatermark({ placement: v as WatermarkPlacement })}
                    />
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Preview</label>
                    <WatermarkPreviewCanvas config={watermarkConfig} />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      Live preview with sample viewer info. Actual viewer details are shown at view time.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── Key Backup Prompt (shown after first key generation) ─────── */}
      {showBackupPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '16px 20px', marginBottom: 20, borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        >
          <Info size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)', marginBottom: 4 }}>🔑 Key Backup Downloaded</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              A new RSA key pair was generated. An encrypted backup file has been auto-downloaded to your computer.
              <strong style={{ color: 'var(--text-primary)' }}> Store it somewhere safe</strong> (password manager, encrypted drive).
              Without it, you cannot decrypt your files on other browsers or devices.
              You can also re-download it anytime from <strong style={{ color: 'var(--accent)' }}>Settings → Encryption → Security Keys</strong>.
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Upload Status ─────────────────────────────────────────────── */}

      <AnimatePresence>
        {status.phase !== 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {status.phase === 'done' ? <CheckCircle size={20} color="var(--green)" /> : status.phase === 'error' ? <AlertCircle size={20} color="var(--danger)" /> : <Loader2 size={20} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />}
              <span style={{ fontSize: 14, fontWeight: 500, color: status.phase === 'done' ? 'var(--green)' : status.phase === 'error' ? 'var(--danger)' : 'var(--text-primary)' }}>{status.message}</span>
            </div>
            {status.phase !== 'error' && (
              <div className="progress-bar">
                <motion.div className="progress-bar-fill" animate={{ width: `${status.progress}%` }} style={{ background: status.phase === 'done' ? 'var(--green)' : undefined }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Upload Button ─────────────────────────────────────────────── */}
      <motion.button id="encrypt-upload-btn" onClick={handleUpload}
        disabled={!selectedFile || (status.phase !== 'idle' && status.phase !== 'error')}
        whileHover={{ scale: selectedFile ? 1.01 : 1 }} whileTap={{ scale: selectedFile ? 0.99 : 1 }}
        className="btn-primary"
        style={{ width: '100%', padding: '16px', fontSize: 16, opacity: !selectedFile ? 0.5 : 1, cursor: !selectedFile ? 'not-allowed' : 'pointer' }}>
        <Lock size={18} /> Encrypt &amp; Upload Securely
      </motion.button>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Eye size={12} /> Your plaintext data never leaves your browser
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
