'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { activityApi, filesApi } from '../../../lib/api';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Server,
  Eye,
  FileCheck2,
  Users,
  Settings,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  hasStoredPrivateKey,
  downloadKeyBackup,
  getPrivateKeyDiagnostics,
} from '../../../lib/crypto/keyManager';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SecurityCenterPage() {
  const { appUser } = useAuth();
  const [hasLocalKey, setHasLocalKey] = useState<boolean>(false);
  const [keyDiagnostics, setKeyDiagnostics] = useState<any>(null);

  useEffect(() => {
    setHasLocalKey(hasStoredPrivateKey());
    setKeyDiagnostics(getPrivateKeyDiagnostics());
  }, []);

  const { data: activityData } = useQuery({
    queryKey: ['activity', { limit: 10 }],
    queryFn: () => activityApi.list({ limit: 10 }).then((r) => r.data),
  });

  const { data: filesData } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.list().then((r) => r.data),
  });

  const files = filesData?.files || [];
  const activities = activityData?.activities || [];

  // Filter security-relevant activities (revoke, share, login, delete, failed_access)
  const securityEvents = activities.filter((a: any) =>
    ['login', 'logout', 'revoke', 'failed_access', 'expired_link'].includes(a.action)
  );

  const handleDownloadBackup = () => {
    try {
      const ok = downloadKeyBackup();
      if (ok) {
        toast.success('Encrypted key backup downloaded successfully');
      } else {
        toast.error('No stored key bundle found to backup');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to download key backup');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Security Center</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
              Security Center
            </h1>
            <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
              Verified cryptographic health, key management, and zero-knowledge posture
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownloadBackup}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13, borderRadius: 12 }}
            >
              <Download size={14} color="#0866D9" />
              <span>Export Key Backup</span>
            </button>
            <Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13, borderRadius: 12 }}
              >
                <Settings size={14} />
                <span>Security Settings</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Security Status Cards Grid ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Client-Side Encryption */}
        <div
          className="glass-card"
          style={{
            padding: '22px 24px',
            background: 'rgba(255, 255, 255, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(36, 189, 112, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#179354',
                }}
              >
                <Lock size={20} />
              </div>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(36, 189, 112, 0.12)',
                  color: '#179354',
                  border: '1px solid rgba(36, 189, 112, 0.25)',
                }}
              >
                ACTIVE & VERIFIED
              </span>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', margin: '0 0 6px' }}>
              Client-Side E2EE
            </h3>
            <p style={{ fontSize: 13, color: '#718493', margin: 0, lineHeight: 1.5 }}>
              Files are encrypted with AES-256-GCM directly inside your browser before transmission. Server never receives plaintext.
            </p>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(22, 131, 248, 0.08)', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#5E7385' }}>
              Algorithm: <strong>AES-256-GCM + PBKDF2 (100k)</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Local Private Key Management */}
        <div
          className="glass-card"
          style={{
            padding: '22px 24px',
            background: 'rgba(255, 255, 255, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: hasLocalKey ? 'rgba(22, 131, 248, 0.1)' : 'rgba(244, 171, 54, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: hasLocalKey ? '#1683F8' : '#F4AB36',
                }}
              >
                <KeyRound size={20} />
              </div>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: hasLocalKey ? 'rgba(36, 189, 112, 0.12)' : 'rgba(244, 171, 54, 0.12)',
                  color: hasLocalKey ? '#179354' : '#B47312',
                  border: hasLocalKey ? '1px solid rgba(36, 189, 112, 0.25)' : '1px solid rgba(244, 171, 54, 0.25)',
                }}
              >
                {hasLocalKey ? 'KEY PRESENT IN BROWSER' : 'KEY BACKUP REQUIRED'}
              </span>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', margin: '0 0 6px' }}>
              RSA-4096 Key Pair
            </h3>
            <p style={{ fontSize: 13, color: '#718493', margin: 0, lineHeight: 1.5 }}>
              {hasLocalKey
                ? 'Your private key is protected by your master passphrase in local device storage. Export a backup to safeguard against device loss.'
                : 'No private key bundle detected on this browser session. Please restore from your exported key backup file.'}
            </p>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(22, 131, 248, 0.08)', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#5E7385' }}>
              Public Key Registered: <strong>{appUser?.publicKey ? 'Yes (Server-Synced)' : 'Pending Upload'}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Zero-Knowledge Server Architecture */}
        <div
          className="glass-card"
          style={{
            padding: '22px 24px',
            background: 'rgba(255, 255, 255, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8B5CF6',
                }}
              >
                <Server size={20} />
              </div>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#7C3AED',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                }}
              >
                ZERO KNOWLEDGE
              </span>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', margin: '0 0 6px' }}>
              Storage Isolation
            </h3>
            <p style={{ fontSize: 13, color: '#718493', margin: 0, lineHeight: 1.5 }}>
              Database records contain only encrypted ciphertext blobs, initialization vectors, and encrypted key envelopes.
            </p>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(22, 131, 248, 0.08)', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#5E7385' }}>
              Decryption Capability: <strong>Owner & Explicit Recipients Only</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Detailed Security Checklist & Diagnostic Info ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Security Checklist */}
        <div
          className="glass-card"
          style={{
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.68)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="#1683F8" />
            Security Checklist & Posture
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CheckCircle2 size={18} color="#24BD70" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  Client-side WebCrypto Hardware Acceleration
                </p>
                <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                  W3C Web Cryptography API executes AES-GCM and PBKDF2 natively.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {hasLocalKey ? (
                <CheckCircle2 size={18} color="#24BD70" style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <AlertTriangle size={18} color="#F4AB36" style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  Master Key Bundle on this Browser
                </p>
                <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                  {hasLocalKey
                    ? 'Encrypted key bundle present. Protected by your master passphrase.'
                    : 'Key bundle absent. Restore in Settings to decrypt files on this device.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CheckCircle2 size={18} color="#24BD70" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  Dynamic Forensics Watermarking
                </p>
                <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                  Viewer name, timestamp, and IP address dynamically stamped on previews.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CheckCircle2 size={18} color="#24BD70" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                  JWT Bearer Token Authentication
                </p>
                <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>
                  Cryptographically signed Firebase auth tokens attached to all API transactions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Public Key & Sharing Overview */}
        <div
          className="glass-card"
          style={{
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.68)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#182B3A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} color="#1683F8" />
            Key Management Guidance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(22, 131, 248, 0.06)', border: '1px solid rgba(22, 131, 248, 0.16)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0866D9', margin: '0 0 4px' }}>
                NEVER SHARE YOUR MASTER PASSPHRASE
              </p>
              <p style={{ fontSize: 12, color: '#5E7385', margin: 0, lineHeight: 1.45 }}>
                Your master passphrase is used strictly on your device to decrypt your private key. SecureVault engineers cannot reset your passphrase or recover lost data without your key backup.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(22, 131, 248, 0.08)' }}>
              <span style={{ fontSize: 13, color: '#5E7385' }}>Public Key Status:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#182B3A' }}>
                {appUser?.publicKey ? 'JWK Published' : 'Not generated yet'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(22, 131, 248, 0.08)' }}>
              <span style={{ fontSize: 13, color: '#5E7385' }}>Key Backup Status:</span>
              <button
                onClick={handleDownloadBackup}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0866D9',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Download size={13} /> Download JSON Backup
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: 13, color: '#5E7385' }}>Key Rotation / Regeneration:</span>
              <Link href="/dashboard/settings" style={{ fontSize: 12.5, fontWeight: 700, color: '#0866D9', textDecoration: 'none' }}>
                Manage in Settings &gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
