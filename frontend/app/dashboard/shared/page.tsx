'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { shareApi } from '../../../lib/api';
import {
  Share2,
  Clock,
  Eye,
  Download,
  Edit2,
  User,
  AlertCircle,
} from 'lucide-react';

interface ShareRecord {
  id: string;
  token: string;
  recipientEmail?: string;
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  requireOTP: boolean;
  isRevoked: boolean;
  createdAt: string;
  file: {
    id: string;
    filename: string;
    mimeType: string;
  };
  owner: {
    name: string;
    email: string;
    photo?: string;
  };
}

function formatTimeLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export default function SharedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => shareApi.sharedWithMe().then((r) => r.data),
  });

  const shares: ShareRecord[] = data?.shares || [];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Shared With Me
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Files others have shared with your account
        </p>
      </motion.div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 90, borderRadius: 14 }} />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}
        >
          <Share2 size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nothing shared yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            When someone shares a file with your email, it will appear here
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shares.map((share, i) => (
            <motion.div
              key={share.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card"
              style={{ padding: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* File icon */}
                <div style={{ fontSize: 32 }}>
                  {share.file.mimeType?.includes('pdf')
                    ? '📄'
                    : share.file.mimeType?.includes('image')
                    ? '🖼️'
                    : '📁'}
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                    {share.file.filename}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <User size={12} />
                    <span>
                      {share.owner.name} ({share.owner.email})
                    </span>
                  </div>
                </div>

                {/* Permissions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {share.canView && (
                    <span className="badge badge-accent" style={{ fontSize: 10 }}>
                      <Eye size={9} /> View
                    </span>
                  )}
                  {share.canDownload && (
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      <Download size={9} /> Download
                    </span>
                  )}
                  {share.canEdit && (
                    <span className="badge badge-purple" style={{ fontSize: 10 }}>
                      <Edit2 size={9} /> Edit
                    </span>
                  )}
                </div>

                {/* Expiry */}
                {share.expiresAt && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: new Date(share.expiresAt) < new Date() ? 'var(--danger)' : 'var(--warning)',
                    }}
                  >
                    {new Date(share.expiresAt) < new Date() ? (
                      <AlertCircle size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    {formatTimeLeft(share.expiresAt)}
                  </div>
                )}

                {/* Views */}
                {share.maxViews && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <Eye size={12} style={{ marginRight: 4 }} />
                    {share.viewCount}/{share.maxViews} views
                  </div>
                )}

                {/* Open button */}
                <a
                  id={`open-share-${share.id}`}
                  href={`/share/${share.token}`}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}
                >
                  Open
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
