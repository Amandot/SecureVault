'use client';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Favorites</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Files you&apos;ve starred for quick access</p>
      </motion.div>
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Star size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No favorites yet</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Star files from My Files to pin them here</p>
      </div>
    </div>
  );
}
