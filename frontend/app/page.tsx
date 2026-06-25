'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Share2,
  Eye,
  Activity,
  Droplets,
  Cloud,
  FileText,
  ChevronRight,
  Zap,
  Check,
  Star,
  ArrowRight,
} from 'lucide-react';

import { fadeUpLarge as fadeUp } from '@/lib/motion';

const features = [
  {
    icon: Shield,
    title: 'End-to-End Encryption',
    desc: 'AES-256-GCM with optional ChaCha20 and XChaCha20 layers. Server never sees your plaintext.',
    color: '#00C8FF',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    desc: 'Share with expiry, view limits, password protection, and IP restrictions.',
    color: '#00E39B',
  },
  {
    icon: Activity,
    title: 'Activity Logs',
    desc: 'Full audit trail of every upload, view, download, and share event.',
    color: '#8B5CF6',
  },
  {
    icon: Eye,
    title: 'Owner Permissions',
    desc: 'Disable download, add dynamic watermarks, set view limits and expiry.',
    color: '#F59E0B',
  },
  {
    icon: Droplets,
    title: 'Dynamic Watermark',
    desc: 'Viewer name, email, timestamp, and IP overlaid during preview.',
    color: '#EF4444',
  },
  {
    icon: Cloud,
    title: 'Cloud Backup',
    desc: 'Encrypted blobs stored in AWS S3 or Cloudflare R2. Zero-knowledge architecture.',
    color: '#00C8FF',
  },
  {
    icon: FileText,
    title: 'Document Preview',
    desc: 'In-browser decryption and PDF/image preview without ever downloading plaintext.',
    color: '#00E39B',
  },
  {
    icon: Lock,
    title: 'Multi-Layer Encryption',
    desc: 'Stack up to 3 encryption layers with different algorithms and passphrases.',
    color: '#8B5CF6',
  },
];

const stats = [
  { value: '256-bit', label: 'AES Key Size' },
  { value: '3 Layers', label: 'Max Encryption' },
  { value: '0%', label: 'Server Access' },
  { value: '100%', label: 'Client-Side' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-bg)' }}>
      {/* ─── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(7, 17, 31, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} color="#000" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Secure<span style={{ color: 'var(--accent)' }}>Vault</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', gap: 12, alignItems: 'center' }}
        >
          <Link href="/login" className="btn-secondary" style={{ padding: '8px 20px' }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px' }}>
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 40px 80px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Background glow orbs */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0,200,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0,227,155,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: 24 }}
        >
          <span
            className="badge badge-accent"
            style={{ fontSize: 12, padding: '6px 16px' }}
          >
            <Zap size={12} />
            Military-Grade Encryption
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(48px, 7vw, 88px)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-3px',
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          Your Privacy{' '}
          <span className="gradient-text">First</span>
          <br />
          Cloud Storage
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 20,
            color: 'var(--text-secondary)',
            maxWidth: 600,
            lineHeight: 1.7,
            marginBottom: 48,
          }}
        >
          End-to-end encrypted document management. Your files are encrypted
          before they leave your device. We never see your data.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 80 }}
        >
          <Link href="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
            Start Free <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }}>
            Learn More <ChevronRight size={18} />
          </Link>
        </motion.div>

        {/* Flow illustration */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {['Upload', '→', 'Encrypt', '→', 'Share', '→', 'Control'].map(
            (item, i) => (
              <span
                key={i}
                style={{
                  padding: item === '→' ? '0 4px' : '8px 20px',
                  borderRadius: 999,
                  background: item === '→' ? 'transparent' : 'var(--card-bg)',
                  border: item === '→' ? 'none' : '1px solid var(--border)',
                  color: item === '→' ? 'var(--text-muted)' : 'var(--accent)',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {item}
              </span>
            )
          )}
        </motion.div>
      </section>

      {/* ─── Stats Bar ──────────────────────────────────────────────────── */}
      <section style={{ padding: '0 40px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '40px 60px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 40,
            textAlign: 'center',
          }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, var(--accent), var(--green))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                }}
              >
                {stat.value}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Section ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <span className="badge badge-green" style={{ marginBottom: 16 }}>
              Features
            </span>
            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 800,
                letterSpacing: '-2px',
                marginBottom: 16,
              }}
            >
              Everything you need to{' '}
              <span className="gradient-text">stay secure</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 500, margin: '0 auto' }}>
              Built for privacy-conscious individuals and enterprises alike.
            </p>
          </motion.div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
            }}
          >
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="glass-card"
                  style={{ padding: 28, cursor: 'default' }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${feature.color}18`,
                      border: `1px solid ${feature.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={22} color={feature.color} />
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      marginBottom: 8,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                    }}
                  >
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Encryption Flow Section ────────────────────────────────────── */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 64,
              alignItems: 'center',
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="badge badge-purple" style={{ marginBottom: 16 }}>
                How it works
              </span>
              <h2
                style={{
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  fontWeight: 800,
                  letterSpacing: '-1.5px',
                  marginBottom: 24,
                  lineHeight: 1.15,
                }}
              >
                Zero-Knowledge{' '}
                <span className="gradient-text-purple">Architecture</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
                Every file is encrypted in your browser before it ever leaves your
                device. Our servers store only encrypted ciphertext — never your
                keys, never your data.
              </p>

              {[
                'File encrypted with AES-256-GCM in browser',
                'Optional ChaCha20 / XChaCha20 layers',
                'AES key wrapped with your RSA-4096 public key',
                'Only ciphertext stored on server',
                'Decryption happens locally on download',
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--green-dim)',
                      border: '1px solid rgba(0,227,155,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Check size={12} color="var(--green)" />
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {item}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Visual flow diagram */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card"
              style={{ padding: 40 }}
            >
              {[
                { label: 'Your File', color: 'var(--text-secondary)', icon: FileText },
                { label: 'AES-256-GCM Encrypt', color: 'var(--accent)', icon: Lock },
                { label: 'ChaCha20 Layer (optional)', color: 'var(--green)', icon: Shield },
                { label: 'RSA Key Wrap', color: 'var(--purple)', icon: Shield },
                { label: 'Encrypted Upload', color: 'var(--warning)', icon: Cloud },
                { label: 'S3 Storage', color: 'var(--text-muted)', icon: Cloud },
              ].map((step, i, arr) => {
                const Icon = step.icon;
                return (
                  <div key={i}>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: `${step.color}0A`,
                        border: `1px solid ${step.color}20`,
                      }}
                    >
                      <Icon size={18} color={step.color} />
                      <span style={{ color: step.color, fontSize: 14, fontWeight: 500 }}>
                        {step.label}
                      </span>
                    </motion.div>
                    {i < arr.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          height: 20,
                          background:
                            'linear-gradient(to bottom, var(--border), transparent)',
                          margin: '0 auto',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px 120px' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card gradient-border"
          style={{
            maxWidth: 700,
            margin: '0 auto',
            padding: '64px 40px',
            textAlign: 'center',
          }}
        >
          <Star size={40} color="var(--accent)" style={{ marginBottom: 24, margin: '0 auto 24px' }} />
          <h2
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-1.5px',
              marginBottom: 16,
            }}
          >
            Ready to secure your files?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 40 }}>
            Join thousands of privacy-first users. Free to get started.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '16px 40px', fontSize: 16 }}>
            Create Free Account <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '32px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-muted)',
          fontSize: 13,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color="var(--accent)" />
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>SecureVault</strong> — Zero-Knowledge
            Encrypted Storage
          </span>
        </div>
        <div>© {new Date().getFullYear()} SecureVault. All rights reserved.</div>
      </footer>
    </div>
  );
}
