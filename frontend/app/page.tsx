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
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import BrandLogo from '../components/icons/BrandLogo';
import { fadeUpLarge as fadeUp } from '@/lib/motion';

const features = [
  {
    icon: Shield,
    title: 'End-to-End Encryption',
    desc: 'AES-256-GCM with optional ChaCha20 and XChaCha20 layers. Server never sees your plaintext.',
    color: '#1683F8',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    desc: 'Share with expiry, view limits, password protection, and IP restrictions.',
    color: '#24BD70',
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
    color: '#F4AB36',
  },
  {
    icon: Droplets,
    title: 'Dynamic Watermark',
    desc: 'Viewer name, email, timestamp, and IP overlaid during preview.',
    color: '#1683F8',
  },
  {
    icon: Cloud,
    title: 'Cloud Backup',
    desc: 'Encrypted blobs stored in AWS S3 or Cloudflare R2. Zero-knowledge architecture.',
    color: '#24BD70',
  },
  {
    icon: FileText,
    title: 'Document Preview',
    desc: 'In-browser decryption and PDF/image preview without ever downloading plaintext.',
    color: '#8B5CF6',
  },
  {
    icon: Lock,
    title: 'Multi-Layer Encryption',
    desc: 'Stack up to 3 encryption layers with different algorithms and passphrases.',
    color: '#F4AB36',
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
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* ─── Floating Frosted Glass Navbar ─────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 14,
          left: 20,
          right: 20,
          zIndex: 50,
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.68)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 22,
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px rgba(35, 94, 138, 0.08)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <BrandLogo size={36} />
          <span style={{ fontSize: 19, fontWeight: 800, color: '#182B3A' }}>
            Secure<span style={{ color: '#1683F8' }}>Vault</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', gap: 10, alignItems: 'center' }}
        >
          <Link href="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 12 }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 12 }}>
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '140px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: 20 }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(22, 131, 248, 0.12)',
              color: '#0866D9',
              border: '1px solid rgba(22, 131, 248, 0.25)',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={14} color="#1683F8" />
            Military-Grade Client-Side Cryptography
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(40px, 6vw, 76px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-2px',
            marginBottom: 20,
            maxWidth: 860,
            color: '#182B3A',
          }}
        >
          Your Privacy First{' '}
          <span style={{ color: '#1683F8' }}>Encrypted Cloud</span> Vault
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: '#5E7385',
            maxWidth: 620,
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          Client-side encrypted file storage and document sharing. No plaintext ever leaves your browser.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 64,
          }}
        >
          <Link href="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 16 }}>
            <span>Create Secure Vault</span>
            <ArrowRight size={17} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 16 }}>
            <span>Sign In to Vault</span>
          </Link>
        </motion.div>

        {/* Stats Row in Frosted Glass Card */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-card"
          style={{
            padding: '24px 40px',
            borderRadius: 24,
            background: 'rgba(255, 255, 255, 0.72)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 32,
            maxWidth: 780,
            width: '100%',
          }}
        >
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#0866D9',
                  letterSpacing: '-0.5px',
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#718493', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Grid ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(22, 131, 248, 0.1)',
                color: '#0866D9',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 12,
              }}
            >
              Enterprise Protection
            </span>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 800,
                color: '#182B3A',
                letterSpacing: '-1px',
                marginBottom: 12,
              }}
            >
              Everything you need to stay private
            </h2>
            <p style={{ color: '#5E7385', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
              Built from the ground up on modern WebCrypto primitives.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 20,
            }}
          >
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="glass-card"
                  style={{
                    padding: '24px 22px',
                    borderRadius: 20,
                    background: 'rgba(255, 255, 255, 0.68)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(35, 94, 138, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(35, 94, 138, 0.07)';
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(22, 131, 248, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: feature.color,
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={22} color={feature.color} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#182B3A', marginBottom: 8 }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#5E7385', lineHeight: 1.6, margin: 0 }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Zero Knowledge Flow ──────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 100px' }}>
        <div
          className="glass-card"
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '56px 40px',
            borderRadius: 28,
            background: 'rgba(255, 255, 255, 0.72)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(22, 131, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#1683F8',
            }}
          >
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#182B3A', marginBottom: 12 }}>
            Ready to secure your documents?
          </h2>
          <p style={{ color: '#5E7385', fontSize: 15, maxWidth: 500, margin: '0 auto 32px' }}>
            Experience the new standard in light-blue glassmorphic cloud file protection.
          </p>

          <Link href="/register">
            <button className="btn-primary" style={{ padding: '14px 36px', fontSize: 15, borderRadius: 16 }}>
              <span>Get Started Now</span>
              <ArrowRight size={17} />
            </button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.8)',
          padding: '24px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#718493',
          fontSize: 12.5,
          flexWrap: 'wrap',
          gap: 16,
          background: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrandLogo size={20} />
          <span>
            <strong style={{ color: '#182B3A' }}>SecureVault</strong> — End-to-End Encrypted Cloud Storage
          </span>
        </div>
        <div>© {new Date().getFullYear()} SecureVault. All rights reserved.</div>
      </footer>
    </div>
  );
}
