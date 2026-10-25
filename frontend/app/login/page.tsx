'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  FileText,
  Share2,
} from 'lucide-react';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import BrandLogo from '../../components/icons/BrandLogo';
import { useAuth } from '../../lib/auth/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const leftFeatures = [
  { icon: Lock, title: 'Client-Side E2EE', desc: 'AES-256-GCM encryption before data leaves your browser' },
  { icon: KeyRound, title: 'RSA-4096 Key Wrapping', desc: 'Secure asymmetric key exchange with zero server knowledge' },
  { icon: ShieldCheck, title: 'Zero-Knowledge Architecture', desc: 'Server stores only encrypted blobs and signed ciphertext' },
  { icon: Share2, title: 'Granular Access Controls', desc: 'Dynamic watermarking, view caps, and instant revocation' },
];

export default function LoginPage() {
  const { signIn, signInGoogle } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(
        msg.includes('user-not-found') || msg.includes('wrong-password')
          ? 'Invalid email or password'
          : msg.includes('too-many-requests')
          ? 'Too many attempts. Please try again later.'
          : msg
      );
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInGoogle();
      router.push('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        background: 'transparent',
      }}
    >
      {/* Outer Glass Card Shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 960,
          minHeight: 580,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          borderRadius: 28,
          background: 'rgba(255, 255, 255, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 20px 60px rgba(35, 94, 138, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* ─── Left Panel: Branding & Features ────────────────────────────── */}
        <div
          style={{
            padding: '48px 40px',
            background: 'linear-gradient(135deg, rgba(235, 247, 254, 0.75) 0%, rgba(208, 237, 252, 0.5) 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <BrandLogo size={38} />
              <span style={{ fontSize: 20, fontWeight: 800, color: '#182B3A' }}>
                Secure<span style={{ color: '#1683F8' }}>Vault</span>
              </span>
            </div>

            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#182B3A',
                lineHeight: 1.2,
                letterSpacing: '-0.8px',
                marginBottom: 12,
              }}
            >
              Your digital vault,{' '}
              <span style={{ color: '#1683F8' }}>encrypted.</span>
            </h1>
            <p style={{ fontSize: 14, color: '#5E7385', lineHeight: 1.6, marginBottom: 36 }}>
              Military-grade client-side encryption that executes in your browser. Complete privacy with zero-knowledge servers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {leftFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(22, 131, 248, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0866D9',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                        {f.title}
                      </h4>
                      <p style={{ fontSize: 12, color: '#718493', margin: '2px 0 0', lineHeight: 1.4 }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(22, 131, 248, 0.1)' }}>
            <span style={{ fontSize: 12, color: '#718493' }}>
              Protected by AES-256-GCM • WebCrypto API Verified
            </span>
          </div>
        </div>

        {/* ─── Right Panel: Sign-In Form ──────────────────────────────────── */}
        <div
          style={{
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.82)',
          }}
        >
          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#182B3A', margin: '0 0 6px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 13.5, color: '#718493', margin: '0 0 28px' }}>
              Sign in to decrypt and access your files
            </p>

            {/* Google Sign In */}
            <button
              id="google-sign-in-btn"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 14,
                marginBottom: 20,
                fontSize: 13.5,
              }}
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon size={16} />}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(22, 131, 248, 0.12)' }} />
              <span style={{ color: '#8FA3B3', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(22, 131, 248, 0.12)' }} />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(240, 68, 68, 0.1)',
                  border: '1px solid rgba(240, 68, 68, 0.25)',
                  color: '#D32F2F',
                  fontSize: 12.5,
                  marginBottom: 16,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 5 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color="#8FA3B3" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="email-input"
                    type="email"
                    className="input-field"
                    placeholder="you@domain.com"
                    style={{ paddingLeft: 38 }}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <span style={{ color: '#F04444', fontSize: 11.5, marginTop: 4, display: 'block' }}>
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetSent(true)}
                    style={{ background: 'none', border: 'none', color: '#0866D9', fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#8FA3B3" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    style={{ paddingLeft: 38, paddingRight: 38 }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8FA3B3', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <span style={{ color: '#F04444', fontSize: 11.5, marginTop: 4, display: 'block' }}>
                    {errors.password.message}
                  </span>
                )}
              </div>

              <button
                id="submit-login-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: 14, marginTop: 8 }}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Unlock Vault</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#718493', marginTop: 24 }}>
              Don&apos;t have a vault yet?{' '}
              <Link href="/register" style={{ color: '#0866D9', fontWeight: 700, textDecoration: 'none' }}>
                Create account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
