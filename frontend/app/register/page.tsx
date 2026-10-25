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
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import BrandLogo from '../../components/icons/BrandLogo';
import { useAuth } from '../../lib/auth/AuthContext';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp, signInGoogle } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    try {
      await signUp(data.name, data.email, data.password);
      router.push('/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(
        msg.includes('email-already-in-use')
          ? 'An account with this email already exists.'
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
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 960,
          minHeight: 600,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          borderRadius: 28,
          background: 'rgba(255, 255, 255, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 20px 60px rgba(35, 94, 138, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* ─── Left Branding Panel ────────────────────────────────────────── */}
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
              Start protecting your files with{' '}
              <span style={{ color: '#1683F8' }}>real cryptography.</span>
            </h1>

            <p style={{ fontSize: 14, color: '#5E7385', lineHeight: 1.6, marginBottom: 32 }}>
              Create an account in seconds. Client-side encryption ensures no third party, host, or server ever sees your unencrypted documents.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Instant RSA-4096 & AES-256 key pair generation',
                'Client-side zero-knowledge document previews',
                'Dynamic watermarking & custom expiry links',
                'Automatic encrypted backup bundle export',
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(36, 189, 112, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#179354',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 13, color: '#182B3A', fontWeight: 600 }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(22, 131, 248, 0.1)' }}>
            <span style={{ fontSize: 12, color: '#718493' }}>
              Free 500 MB Encrypted Cloud Vault included
            </span>
          </div>
        </div>

        {/* ─── Right Form Panel ────────────────────────────────────────────── */}
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
              Create your Vault
            </h2>
            <p style={{ fontSize: 13.5, color: '#718493', margin: '0 0 24px' }}>
              Enter your details to generate your master keys
            </p>

            {/* Google Sign Up */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 14,
                marginBottom: 18,
                fontSize: 13.5,
              }}
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon size={16} />}
              <span>Sign up with Google</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
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

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#8FA3B3" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="name-input"
                    type="text"
                    className="input-field"
                    placeholder="Jane Doe"
                    style={{ paddingLeft: 38 }}
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <span style={{ color: '#F04444', fontSize: 11.5, marginTop: 4, display: 'block' }}>
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 4 }}>
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
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 4 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#8FA3B3" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="At least 8 characters"
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

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#182B3A', display: 'block', marginBottom: 4 }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#8FA3B3" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="confirm-password-input"
                    type="password"
                    className="input-field"
                    placeholder="Re-enter password"
                    style={{ paddingLeft: 38 }}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <span style={{ color: '#F04444', fontSize: 11.5, marginTop: 4, display: 'block' }}>
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: 14, marginTop: 10 }}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Create Vault</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#718493', marginTop: 20 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#0866D9', fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
