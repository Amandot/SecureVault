'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../lib/auth/AuthContext';
import { authApi } from '../../../lib/api';
import { User, Lock, Bell, Shield, Monitor, Key, Save, Loader2, CheckCircle, Download, Upload, AlertTriangle } from 'lucide-react';
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
import ThemeSelector from '../../../components/settings/ThemeSelector';
import { Palette } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'encryption', label: 'Encryption', icon: Lock },
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

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.register({ name });
      await refreshAppUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const regenerateKeyPair = async () => {
    if (!keyPassphrase) {
      alert('Enter a passphrase to protect your private key');
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
      setTimeout(() => setKeyGenDone(false), 3000);
    } catch (err) {
      alert('Failed to generate keys: ' + (err instanceof Error ? err.message : err));
    } finally {
      setGeneratingKeys(false);
    }
  };

  const handleRestoreKey = async (file: File) => {
    if (!restorePassphrase) {
      setRestoreError('Enter your master passphrase first.');
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
      setTimeout(() => setRestoreDone(false), 4000);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore key backup.');
    } finally {
      setRestoring(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Manage your account, encryption keys, and preferences
        </p>
      </motion.div>

      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 6,
          marginBottom: 28,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '9px 14px',
                background: activeTab === tab.id ? 'var(--accent-dim)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(0,200,255,0.2)' : '1px solid transparent',
                borderRadius: 10,
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Profile Tab ────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--accent)" /> Profile Information
            </h2>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              {appUser?.photo ? (
                <Image
                  src={appUser.photo}
                  alt={appUser.name}
                  width={64}
                  height={64}
                  style={{ borderRadius: '50%', border: '2px solid var(--border)' }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#000',
                    border: '2px solid var(--border)',
                  }}
                >
                  {appUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{appUser?.name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{appUser?.email}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  Member since{' '}
                  {appUser
                    ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Display Name
                </label>
                <input
                  id="settings-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={appUser?.email || ''}
                  disabled
                  className="input-field"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Email is managed by Firebase Authentication
                </p>
              </div>

              <button
                id="save-profile-btn"
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
              >
                {saved ? (
                  <>
                    <CheckCircle size={15} /> Saved!
                  </>
                ) : saving ? (
                  <Loader2 size={15} />
                ) : (
                  <>
                    <Save size={15} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Appearance Tab ─────────────────────────────────────────────── */}
      {activeTab === 'appearance' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ThemeSelector />
        </motion.div>
      )}

      {/* ─── Encryption Tab ──────────────────────────────────────────────── */}
      {activeTab === 'encryption' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} color="var(--accent)" /> RSA Key Pair
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Your RSA-4096 key pair is used to wrap AES encryption keys. The{' '}
              <strong>public key</strong> is stored on our server; the{' '}
              <strong>private key</strong> is encrypted with your passphrase and stored
              locally — we never see it.
            </p>

            <div
              style={{
                padding: '14px 16px',
                background: appUser?.publicKey ? 'var(--green-dim)' : 'var(--warning-dim)',
                border: `1px solid ${appUser?.publicKey ? 'rgba(0,227,155,0.25)' : 'rgba(245,158,11,0.25)'}`,
                borderRadius: 12,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {appUser?.publicKey ? (
                <>
                  <CheckCircle size={16} color="var(--green)" />
                  <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 500 }}>
                    Public key is registered — sharing is enabled
                  </span>
                </>
              ) : (
                <>
                  <Key size={16} color="var(--warning)" />
                  <span style={{ color: 'var(--warning)', fontSize: 13, fontWeight: 500 }}>
                    No key pair yet — generate one below to enable sharing
                  </span>
                </>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Key Protection Passphrase
              </label>
              <input
                id="key-passphrase-input"
                type="password"
                value={keyPassphrase}
                onChange={(e) => setKeyPassphrase(e.target.value)}
                placeholder="Strong passphrase to encrypt your private key"
                className="input-field"
                style={{ marginBottom: 16 }}
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
              {appUser?.publicKey && (
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 10 }}>
                  ⚠️ Regenerating will invalidate all existing encrypted keys
                </p>
              )}
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 20,
            }}
          >
            <Monitor size={16} color="var(--text-muted)" />
            Private key stored:{' '}
            <span style={{ color: keyPresent ? 'var(--green)' : 'var(--warning)', fontWeight: 600 }}>
              {keyPresent ? 'Yes (in localStorage, encrypted)' : 'Not found — upload may fail'}
            </span>
          </div>

          {/* ── Key Backup / Restore ──────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} color="var(--warning)" /> Security Keys — Backup & Restore
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Your private key is stored only in <strong>this browser's localStorage</strong>. If you clear browser data,
              switch browsers, or use a new device, you will need your backup file to decrypt existing files.
              The backup is encrypted with your master passphrase — it's safe to store.
            </p>

            {/* Download backup */}
            <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.15)', borderRadius: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Download Key Backup</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                Save your encrypted private key as a <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>.json</code> file.
                Store it somewhere safe (password manager, encrypted drive). You'll need it if you ever clear browser data or switch devices.
              </p>
              {!keyPresent && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
                  <AlertTriangle size={14} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    No key found in this browser. Generate a key pair above, or restore from a backup below.
                  </p>
                </div>
              )}
              <button
                id="download-key-backup-btn"
                onClick={() => { downloadKeyBackup(); setBackupDownloaded(true); }}
                disabled={!keyPresent}
                className="btn-primary"
                style={{ opacity: keyPresent ? 1 : 0.4 }}
              >
                {backupDownloaded ? <><CheckCircle size={15} /> Downloaded!</> : <><Download size={15} /> Download Encrypted Backup</>}
              </button>
            </div>

            {/* Restore backup */}
            <div style={{ padding: '16px 20px', background: 'rgba(0,227,155,0.04)', border: '1px solid rgba(0,227,155,0.15)', borderRadius: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Restore Key from Backup</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                Upload your backup file and enter the master passphrase you used when the key was created.
              </p>

              {restoreError && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                  <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{restoreError}</p>
                </div>
              )}
              {restoreDone && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(0,227,155,0.08)', border: '1px solid rgba(0,227,155,0.25)', borderRadius: 8 }}>
                  <CheckCircle size={14} color="var(--green)" />
                  <p style={{ fontSize: 12, color: 'var(--green)', margin: 0 }}>Key restored successfully! You can now decrypt your files.</p>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Master Passphrase (for the backup)</label>
                <input
                  id="restore-passphrase-input"
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder="Enter your master passphrase"
                  className="input-field"
                />
              </div>
              <input
                ref={fileInputRef}
                id="restore-key-file-input"
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRestoreKey(f);
                }}
              />
              <button
                id="restore-key-backup-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring || !restorePassphrase}
                className="btn-secondary"
                style={{ opacity: restorePassphrase ? 1 : 0.4 }}
              >
                {restoring ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Upload size={15} /> Select Backup File (.json)</>}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Notifications Tab ───────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="var(--accent)" /> Notification Preferences
            </h2>

            {[
              { label: 'Someone views your file', desc: 'Get notified when a recipient opens your file', default: true },
              { label: 'Someone downloads your file', desc: 'Alert when a file is downloaded', default: true },
              { label: 'Share link expires', desc: 'Reminder before a share link expires', default: false },
              { label: 'Access requests', desc: 'When someone requests access to a file', default: true },
              { label: 'New device login', desc: 'Alert when your account is accessed from a new device', default: true },
            ].map((notif, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{notif.label}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{notif.desc}</p>
                </div>
                <input
                  id={`notif-toggle-${i}`}
                  type="checkbox"
                  defaultChecked={notif.default}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Security Tab ────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="var(--accent)" /> Security Overview
            </h2>

            {[
              { label: 'Authentication', value: 'Firebase Authentication', status: 'secure' },
              { label: 'Encryption', value: 'AES-256-GCM (client-side)', status: 'secure' },
              { label: 'Key Storage', value: hasStoredPrivateKey() ? 'Private key: Encrypted in localStorage' : 'No private key stored', status: hasStoredPrivateKey() ? 'secure' : 'warning' },
              { label: 'Transport', value: 'HTTPS (TLS 1.3)', status: 'secure' },
              { label: 'Server Access to Files', value: 'None (Zero-Knowledge)', status: 'secure' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{item.value}</p>
                </div>
                <span
                  className={`badge ${item.status === 'secure' ? 'badge-green' : 'badge-warning'}`}
                  style={{ fontSize: 10 }}
                >
                  {item.status === 'secure' ? '✓ Secure' : '⚠ Warning'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
