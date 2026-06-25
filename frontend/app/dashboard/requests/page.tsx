'use client';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function RequestsPage() {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Access Requests</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Pending requests for access to your files</p>
      </motion.div>
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Inbox size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No pending requests</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          When users request access to your files, they&apos;ll appear here
        </p>
      </div>
    </div>
  );
}
