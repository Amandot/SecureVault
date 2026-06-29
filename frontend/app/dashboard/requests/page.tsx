'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Check, X, Clock, Download, Edit3, Shield, User, ChevronRight } from 'lucide-react';
import { accessRequestsApi } from '../../../lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

type Tab = 'pending' | 'approved' | 'rejected';

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => accessRequestsApi.list().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => accessRequestsApi.approve(id),
    onSuccess: () => {
      toast.success('Request approved');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
    onError: () => toast.error('Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => accessRequestsApi.reject(id),
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const incomingRequests = data?.incoming || [];
  const filteredRequests = incomingRequests.filter((req: any) => req.status === activeTab);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Access Requests</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Manage requests from users who want access to your files</p>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        {(['pending', 'approved', 'rejected'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'capitalize',
              background: activeTab === tab ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {tab === 'pending' && <Clock size={14} />}
            {tab === 'approved' && <Check size={14} />}
            {tab === 'rejected' && <X size={14} />}
            {tab}
            {tab === 'pending' && incomingRequests.filter((r: any) => r.status === 'pending').length > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#000', padding: '2px 6px',
                borderRadius: 12, fontSize: 11, fontWeight: 700
              }}>
                {incomingRequests.filter((r: any) => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ padding: 24, height: 120 }}>
              <div className="skeleton" style={{ width: '40%', height: 16, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '60%', height: 12 }} />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--card-bg)', borderRadius: 16, border: '1px dashed var(--border)' }}>
          <Inbox size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No {activeTab} requests</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {activeTab === 'pending' ? 'You have no pending access requests to review.' : `You don't have any ${activeTab} requests.`}
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <AnimatePresence>
            {filteredRequests.map((req: any) => (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card"
                style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'flex-start' }}
              >
                {/* Avatar */}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {req.requester.photo ? <img src={req.requester.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--accent)" />}
                </div>

                <div style={{ flex: 1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{req.requester.name || req.requester.email}</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{req.requester.email}</p>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* File & Permissions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>requested access to</span>
                    <span className="badge badge-accent" style={{ background: 'rgba(0,200,255,0.05)', color: 'var(--text-primary)' }}>
                      <Shield size={10} color="var(--accent)" /> {req.file.filename}
                    </span>
                  </div>

                  {/* Requested Permissions badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {req.requestedDownload && <span className="badge badge-green"><Download size={10} /> Download</span>}
                    {req.requestedEdit && <span className="badge badge-warning"><Edit3 size={10} /> Edit</span>}
                    {req.requestedExpiresAt && (
                      <span className="badge" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        Extend Expiry to {new Date(req.requestedExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {req.requestedMaxViews && (
                      <span className="badge" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        Max Views: {req.requestedMaxViews}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  {req.message && (
                    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid var(--border)', borderRadius: '0 8px 8px 0', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 16 }}>
                      "{req.message}"
                    </div>
                  )}

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                      <button
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                        className="btn-primary"
                        style={{ padding: '8px 24px', fontSize: 13 }}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                        className="btn-ghost"
                        style={{ padding: '8px 24px', fontSize: 13, color: 'var(--danger)' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
