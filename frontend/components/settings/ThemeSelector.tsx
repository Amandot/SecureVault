'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Palette, CheckCircle2, Sparkles, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const themes = [
  {
    id: 'light',
    name: 'Blue Glassmorphism',
    desc: 'Soft sky-blue canvas with frosted white glass and navy text',
    color: '#1683F8',
    bg: 'linear-gradient(135deg, #DDF2FC, #C5E8FA)',
  },
  {
    id: 'dark',
    name: 'Deep Blue Glass',
    desc: 'Atmospheric midnight slate-blue with glowing translucent glass',
    color: '#38C6FF',
    bg: 'linear-gradient(135deg, #0C1A29, #152E48)',
  },
];

export default function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="glass-card" style={{ padding: 28, background: 'rgba(255, 255, 255, 0.72)', borderRadius: 22 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#182B3A', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Palette size={18} color="#1683F8" /> Interface Appearance
      </h2>
      <p style={{ color: '#5E7385', fontSize: 13.5, marginBottom: 24, lineHeight: 1.6 }}>
        Select your preferred glassmorphic palette for SecureVault. Both options feature ultra-fine backdrop blur and rounded floating panels.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
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
                padding: 18,
                background: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)',
                border: isActive ? `2px solid ${t.color}` : '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: 18,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 8px 24px rgba(22, 131, 248, 0.14)' : '0 2px 8px rgba(35, 94, 138, 0.04)',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 70,
                  background: t.bg,
                  borderRadius: 12,
                  marginBottom: 14,
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(8px)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#182B3A',
                    boxShadow: '0 2px 8px rgba(35, 94, 138, 0.1)',
                  }}
                >
                  {t.name}
                </div>
              </div>

              <span style={{ fontSize: 15, fontWeight: 700, color: '#182B3A', marginBottom: 4 }}>
                {t.name}
              </span>
              <span style={{ fontSize: 12, color: '#718493', lineHeight: 1.4 }}>
                {t.desc}
              </span>

              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    color: t.color,
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
