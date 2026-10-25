'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../lib/auth/AuthContext';
import { authApi } from '../../../lib/api';
import {
  User,
  Lock,
  Bell,
  Shield,
  Key,
  Save,
  Loader2,
  CheckCircle,
  Download,
  Upload,
  AlertTriangle,
  Palette,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  storePrivateKey,
  hasStoredPrivateKey,
  downloadKeyBackup,
  importEncryptedKeyBundle,
} from '../../../lib/crypto/keyManager';
import Image from 'next/image';
import Link from 'next/link';
import ThemeSelector from '../../../components/settings/ThemeSelector';
import { toast } from 'sonner';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'encryption', label: 'Encryption & Keys', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const { appUser, refreshAppUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(appUser?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyPassphrase, setKeyPassphrase] = useState('');
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [keyGenDone, setKeyGenDone] = useState(false);

  // Key backup/restore state
  const [keyPresent, setKeyPresent] = useState(hasStoredPrivateKey());
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreDone, setRestoreDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification toggles
  const [notifyShare, setNotifyShare] = useState(true);
  const [notifyDownload, setNotifyDownload] = useState(true);
  const [notifySecurity, setNotifySecurity] = useState(true);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.register({ name });
      await refreshAppUser();
      setSaved(true);
      toast.success('Profile updated successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const regenerateKeyPair = async () => {
    if (!keyPassphrase) {
      toast.error('Enter a passphrase to protect your private key');
      return;
    }
    setGeneratingKeys(true);
    try {
      const keyPair = await generateKeyPair();
      const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
      const pkcs8 = await exportPrivateKey(keyPair.privateKey);
      await storePrivateKey(pkcs8, keyPassphrase, publicKeyJwk);
      await authApi.updatePublicKey(publicKeyJwk);
      await refreshAppUser();
      setKeyPresent(true);
      setKeyGenDone(true);
      toast.success('RSA Key Pair generated and public key registered');
      setTimeout(() => setKeyGenDone(false), 3000);
    } catch (err: any) {
      toast.error('Failed to generate keys: ' + (err instanceof Error ? err.message : err));
    } finally {
      setGeneratingKeys(false);
    }
  };

  const handleRestoreKey = async (file: File) => {
    if (!restorePassphrase) {
      setRestoreError('Enter your master passphrase first.');
      toast.error('Enter master passphrase first');
      return;
    }
    setRestoring(true);
    setRestoreError('');
    setRestoreDone(false);
    try {
      const text = await file.text();
      await importEncryptedKeyBundle(text, restorePassphrase);
      setKeyPresent(true);
      setRestoreDone(true);
      toast.success('Private key bundle restored successfully');
      setTimeout(() => setRestoreDone(false), 4000);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Failed to restore key backup.';
      setRestoreError(msg);
      toast.error(msg);
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Settings</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Manage your account profile, appearance, encryption keys, and security preferences
        </p>
      </div>

      {/* ─── Tab Bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.65)',
          padding: 6,
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 2px 10px rgba(35, 94, 138, 0.04)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: isActive ? '1px solid rgba(22, 131, 248, 0.3)' : '1px solid transparent',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#0866D9' : '#5E7385',
                boxShadow: isActive ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Profile Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="glass-card"
            style={{
              padding: 28,
              background: 'rgba(255, 255, 255, 0.72)',
              borderRadius: 22,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#1683F8" /> Profile Information
            </h2>

            {/* Avatar presentation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
              {appUser?.photo ? (
                <Image
                  src={appUser.photo}
                  alt={appUser.name || 'User'}
                  width={60}
                  height={60}
                  style={{
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 4px 12px rgba(22, 131, 248, 0.15)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1683F8, #0866D9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 4px 14px rgba(22, 131, 248, 0.2)',
                  }}
                >
                  {appUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: '#182B3A', margin: 0 }}>
                  {appUser?.name || 'User'}
                </p>
                <p style={{ color: '#718493', fontSize: 13, margin: '2px 0 0' }}>{appUser?.email}</p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#179354',
                    background: 'rgba(36, 189, 112, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  <ShieldCheck size={12} /> Verified Account
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 6 }}>
                  Display Name
                </label>
                <input
                  id="settings-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{ maxWidth: 440 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={appUser?.email || ''}
                  disabled
                  className="input-field"
                  style={{ opacity: 0.65, cursor: 'not-allowed', maxWidth: 440 }}
                />
                <p style={{ fontSize: 11.5, color: '#8FA3B3', marginTop: 4 }}>
                  Managed securely via Firebase Authentication
                </p>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  id="save-profile-btn"
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {saved ? (
                    <>
                      <CheckCircle size={15} /> Saved!
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Appearance Tab ──────────────────────────────────────────────── */}
      {activeTab === 'appearance' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ThemeSelector />
        </motion.div>
      )}

      {/* ─── Encryption & Keys Tab ────────────────────────────────────────── */}
      {activeTab === 'encryption' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* RSA Key Pair Card */}
          <div className="glass-card" style={{ padding: 28, background: 'rgba(255, 255, 255, 0.72)', borderRadius: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} color="#1683F8" /> RSA-4096 Key Pair Management
            </h2>
            <p style={{ color: '#5E7385', fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
              Your RSA-4096 key pair wraps file encryption keys during sharing. The public key is synced to the server, while the private key remains strictly on this device, encrypted by your master passphrase.
            </p>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: appUser?.publicKey ? 'rgba(36, 189, 112, 0.1)' : 'rgba(244, 171, 54, 0.1)',
                border: appUser?.publicKey ? '1px solid rgba(36, 189, 112, 0.25)' : '1px solid rgba(244, 171, 54, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {appUser?.publicKey ? (
                <>
                  <CheckCircle size={16} color="#179354" />
                  <span style={{ color: '#179354', fontSize: 13, fontWeight: 600 }}>
                    Public key registered on server — recipient key-wrapping is active
                  </span>
                </>
              ) : (
                <>
                  <Key size={16} color="#B47312" />
                  <span style={{ color: '#B47312', fontSize: 13, fontWeight: 600 }}>
                    No public key registered yet — generate your key pair below
                  </span>
                </>
              )}
            </div>

            <div style={{ maxWidth: 440 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 6 }}>
                Master Key Protection Passphrase
              </label>
              <input
                id="key-passphrase-input"
                type="password"
                value={keyPassphrase}
                onChange={(e) => setKeyPassphrase(e.target.value)}
                placeholder="Strong passphrase to encrypt your private key"
                className="input-field"
                style={{ marginBottom: 14 }}
              />

              <button
                id="generate-keys-btn"
                onClick={regenerateKeyPair}
                disabled={generatingKeys || !keyPassphrase}
                className={appUser?.publicKey ? 'btn-secondary' : 'btn-primary'}
                style={{ opacity: !keyPassphrase ? 0.5 : 1 }}
              >
                {generatingKeys ? (
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                ) : keyGenDone ? (
                  <>
                    <CheckCircle size={15} /> Keys Generated!
                  </>
                ) : (
                  <>
                    <Key size={15} />
                    {appUser?.publicKey ? 'Regenerate Key Pair' : 'Generate Key Pair'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Key Backup & Restore Card */}
          <div className="glass-card" style={{ padding: 28, background: 'rgba(255, 255, 255, 0.72)', borderRadius: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={18} color="#1683F8" /> Key Backup & Cross-Device Restore
            </h2>
            <p style={{ color: '#5E7385', fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
              Download your encrypted key bundle as a backup JSON file. When signing in from another computer, import this file and enter your master passphrase to restore your private key.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {/* Export Button */}
              <button
                onClick={() => {
                  const ok = downloadKeyBackup();
                  if (ok) toast.success('Key backup downloaded');
                }}
                disabled={!keyPresent}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13, borderRadius: 12, opacity: keyPresent ? 1 : 0.5 }}
              >
                <Download size={15} />
                <span>Download Encrypted Key Backup (.json)</span>
              </button>
            </div>

            {/* Restore Section */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(22, 131, 248, 0.1)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#182B3A', marginBottom: 12 }}>
                Restore Key on this Device
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440 }}>
                <input
                  type="password"
                  placeholder="Enter your master passphrase"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  className="input-field"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleRestoreKey(f);
                  }}
                  style={{ fontSize: 13, color: '#5E7385' }}
                />

                {restoreDone && (
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#179354' }}>
                    ✓ Key bundle successfully restored!
                  </p>
                )}
                {restoreError && (
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#D32F2F' }}>
                    {restoreError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Notifications Tab ────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28, background: 'rgba(255, 255, 255, 0.72)', borderRadius: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#1683F8" /> Notification Preferences
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#182B3A', margin: 0 }}>File Shared With You</p>
                  <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>Receive alerts when another user authorizes a file for your account</p>
                </div>
                <input type="checkbox" checked={notifyShare} onChange={(e) => setNotifyShare(e.target.checked)} style={{ accentColor: '#1683F8', width: 18, height: 18, cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#182B3A', margin: 0 }}>Download & View Activity</p>
                  <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>Alert me when someone accesses or downloads a shared file</p>
                </div>
                <input type="checkbox" checked={notifyDownload} onChange={(e) => setNotifyDownload(e.target.checked)} style={{ accentColor: '#1683F8', width: 18, height: 18, cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#182B3A', margin: 0 }}>Security & Audit Events</p>
                  <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0' }}>Alert on link revocation, expired access, or unauthorized requests</p>
                </div>
                <input type="checkbox" checked={notifySecurity} onChange={(e) => setNotifySecurity(e.target.checked)} style={{ accentColor: '#1683F8', width: 18, height: 18, cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Security Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28, background: 'rgba(255, 255, 255, 0.72)', borderRadius: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="#1683F8" /> Account Security & Sessions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(22, 131, 248, 0.06)', border: '1px solid rgba(22, 131, 248, 0.16)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0866D9', margin: '0 0 4px' }}>
                  ACTIVE ENCRYPTED SESSION
                </p>
                <p style={{ fontSize: 12.5, color: '#5E7385', margin: 0 }}>
                  Signed in as <strong>{appUser?.email}</strong>. Authentication tokens automatically refresh using Firebase Auth.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(22, 131, 248, 0.08)' }}>
                <span style={{ fontSize: 13, color: '#5E7385' }}>Security Audit Status</span>
                <Link href="/dashboard/security" style={{ fontSize: 13, fontWeight: 700, color: '#0866D9', textDecoration: 'none' }}>
                  Visit Security Center &gt;
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: 13, color: '#5E7385' }}>Audit History Logs</span>
                <Link href="/dashboard/activity" style={{ fontSize: 13, fontWeight: 700, color: '#0866D9', textDecoration: 'none' }}>
                  View Full Audit Log &gt;
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
