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
} from 'lucide-react';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { useAuth } from '../../lib/auth/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const leftFeatures = [
  { icon: '🔐', title: 'Protect Your Files', desc: 'AES-256-GCM encryption before upload' },
  { icon: '🚀', title: 'Upload Securely', desc: 'Encrypted directly from your browser' },
  { icon: '🛡️', title: 'End-to-End Encrypted', desc: 'Zero-knowledge — server sees nothing' },
  { icon: '🤝', title: 'Share with Confidence', desc: 'Granular permissions and expiry control' },
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
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--primary-bg)',
      }}
    >
      {/* ─── Left Panel ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #07111F 100%)',
          padding: '60px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '-20%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,255,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60 }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={24} color="#000" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700 }}>
            Secure<span style={{ color: 'var(--accent)' }}>Vault</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: 16,
          }}
        >
          Your files,{' '}
          <span className="gradient-text">encrypted.</span>
          <br />
          Always.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 48 }}
        >
          Military-grade encryption that happens in your browser.
          We never see your files or your keys.
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {leftFeatures.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {f.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Right Panel (Form) ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 60px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-1px',
              marginBottom: 8,
            }}
          >
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 40 }}>
            Sign in to your encrypted vault
          </p>

          {/* Google Sign In */}
          <motion.button
            id="google-sign-in-btn"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 24,
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleIcon size={18} />
            )}
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px 16px',
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                color: 'var(--danger)',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="email-input"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  style={{ paddingLeft: 42 }}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetSent(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {resetSent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  background: 'var(--green-dim)',
                  border: '1px solid rgba(0,227,155,0.3)',
                  borderRadius: 10,
                  color: 'var(--green)',
                  fontSize: 13,
                }}
              >
                <CheckCircle size={16} />
                Password reset email sent (check your inbox)
              </motion.div>
            )}

            <motion.button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: 8 }}
            >
              {isSubmitting ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 14,
              marginTop: 28,
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
