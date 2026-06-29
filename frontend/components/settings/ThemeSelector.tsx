'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const themes = [
  { id: 'cyan', name: 'Cyber Cyan', color: '#00C8FF', bg: 'linear-gradient(135deg, #07111F, #0A1628)' },
  { id: 'emerald', name: 'Matrix Emerald', color: '#00E39B', bg: 'linear-gradient(135deg, #051A15, #0A2921)' },
  { id: 'purple', name: 'Neon Purple', color: '#8B5CF6', bg: 'linear-gradient(135deg, #1A0B2E, #2D144A)' },
];

export default function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Palette size={18} color="var(--accent)" /> Application Theme
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
        Choose a color palette for your SecureVault interface. This preference is saved locally on this device.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme(t.id)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: 16,
                background: isActive ? 'var(--card-bg-hover)' : 'var(--card-bg)',
                border: isActive ? `1px solid ${t.color}` : '1px solid var(--border)',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                overflow: 'hidden',
                boxShadow: isActive ? `0 0 20px ${t.color}20` : 'none',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 60,
                  background: t.bg,
                  borderRadius: 10,
                  marginBottom: 12,
                  border: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: t.color,
                    boxShadow: `0 0 20px ${t.color}80`,
                  }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {t.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isActive ? 'Active Theme' : 'Click to apply'}
              </span>

              {isActive && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: t.color,
                  }}
                >
                  <CheckCircle2 size={18} fill={`${t.color}20`} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
