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
} from 'lucide-react';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
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
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--primary-bg)',
      }}
    >
      {/* Left Decorative Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #07111F 100%)',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '-10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,227,155,0.08) 0%, transparent 70%)',
          }}
        />

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
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: 16,
          }}
        >
          Start your{' '}
          <span className="gradient-text">zero-knowledge</span>
          <br />
          storage journey
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7 }}
        >
          Create your account and get instant access to military-grade encrypted
          cloud storage. No credit card required.
        </motion.p>

        {/* Decorative cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {[
            { label: 'AES-256-GCM encryption', color: 'var(--accent)' },
            { label: 'RSA-4096 key wrapping', color: 'var(--green)' },
            { label: 'Zero-knowledge architecture', color: 'var(--purple)' },
            { label: 'Owner-controlled sharing', color: 'var(--warning)' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}`,
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right Form Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
            Create your account
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 36 }}>
            Your encrypted vault awaits
          </p>

          <button
            id="google-register-btn"
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
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {googleLoading ? <Loader2 size={18} /> : <GoogleIcon size={18} />}
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {error && (
            <div
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
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Full name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="name-input"
                  type="text"
                  className="input-field"
                  placeholder="John Doe"
                  style={{ paddingLeft: 42 }}
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.name.message}
                </span>
              )}
            </div>

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
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Password
              </label>
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
                  placeholder="Min. 8 characters"
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

            {/* Confirm Password */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Confirm password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Repeat password"
                  style={{ paddingLeft: 42 }}
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <motion.button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: 8 }}
            >
              {isSubmitting ? (
                <Loader2 size={18} />
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginTop: 28 }}>
            Already have an account?{' '}
            <Link
              href="/login"
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
