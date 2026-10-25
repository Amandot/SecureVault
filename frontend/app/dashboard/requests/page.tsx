'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox,
  Check,
  X,
  Clock,
  Download,
  Edit3,
  Shield,
  User,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Eye,
} from 'lucide-react';
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
      toast.success('Access request approved');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
    onError: () => toast.error('Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => accessRequestsApi.reject(id),
    onSuccess: () => {
      toast.success('Access request rejected');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const incomingRequests = data?.incoming || [];
  const filteredRequests = incomingRequests.filter((req: any) => req.status === activeTab);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718493', marginBottom: 4 }}>
          <span>SecureVault</span>
          <span>/</span>
          <span style={{ color: '#0866D9', fontWeight: 600 }}>Access Requests</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#182B3A', margin: 0, letterSpacing: '-0.4px' }}>
          File Access Requests
        </h1>
        <p style={{ fontSize: 13, color: '#718493', margin: '3px 0 0' }}>
          Review and authorize incoming permissions for encrypted files in your vault
        </p>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.65)',
          padding: 6,
          borderRadius: 16,
          width: 'fit-content',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 2px 10px rgba(35, 94, 138, 0.04)',
          marginBottom: 24,
        }}
      >
        {(['pending', 'approved', 'rejected'] as Tab[]).map((tab) => {
          const count = incomingRequests.filter((r: any) => r.status === tab).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
                border: isActive ? '1px solid rgba(22, 131, 248, 0.3)' : '1px solid transparent',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#0866D9' : '#5E7385',
                boxShadow: isActive ? '0 2px 8px rgba(22, 131, 248, 0.12)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              {tab === 'pending' && <Clock size={14} />}
              {tab === 'approved' && <CheckCircle2 size={14} color="#24BD70" />}
              {tab === 'rejected' && <XCircle size={14} color="#F04444" />}
              <span>{tab}</span>
              <span
                style={{
                  background:
                    isActive && tab === 'pending'
                      ? '#F04444'
                      : isActive
                      ? 'rgba(22, 131, 248, 0.12)'
                      : 'rgba(143, 163, 179, 0.14)',
                  color: isActive && tab === 'pending' ? '#FFFFFF' : isActive ? '#0866D9' : '#718493',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── List of Requests ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 110, borderRadius: 20 }} />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(22, 131, 248, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#1683F8',
            }}
          >
            <Inbox size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#182B3A', marginBottom: 4 }}>
            No {activeTab} requests
          </h3>
          <p style={{ fontSize: 13.5, color: '#718493' }}>
            {activeTab === 'pending'
              ? 'You have answered all incoming access requests. Great job!'
              : `No requests with ${activeTab} status found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <AnimatePresence>
            {filteredRequests.map((req: any) => (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-card"
                style={{
                  padding: '20px 24px',
                  background: 'rgba(255, 255, 255, 0.72)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderRadius: 20,
                }}
              >
                {/* Requester info & File info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: 'rgba(22, 131, 248, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1683F8',
                      fontWeight: 700,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {req.requester?.name?.[0]?.toUpperCase() || 'U'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#182B3A', margin: 0 }}>
                        {req.requester?.name || 'Anonymous User'}
                      </h4>
                      <span style={{ fontSize: 11.5, color: '#8FA3B3' }}>({req.requester?.email})</span>
                    </div>

                    <p style={{ fontSize: 13, color: '#5E7385', margin: '2px 0 0' }}>
                      Requested access to:{' '}
                      <strong style={{ color: '#0866D9' }}>{req.file?.filename || 'File'}</strong>
                    </p>

                    {req.message && (
                      <p style={{ fontSize: 12, color: '#718493', fontStyle: 'italic', margin: '4px 0 0' }}>
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Permissions tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {req.requestedDownload && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#7C3AED',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                      }}
                    >
                      Download Rights
                    </span>
                  )}
                  {req.requestedEdit && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(244, 171, 54, 0.12)',
                        color: '#B47312',
                        border: '1px solid rgba(244, 171, 54, 0.25)',
                      }}
                    >
                      Edit Permission
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: '#8FA3B3' }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: 12, borderRadius: 10 }}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                        className="btn-danger"
                        style={{ padding: '8px 14px', fontSize: 12, borderRadius: 10 }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: req.status === 'approved' ? 'rgba(36, 189, 112, 0.12)' : 'rgba(240, 68, 68, 0.12)',
                        color: req.status === 'approved' ? '#179354' : '#D32F2F',
                        border: req.status === 'approved' ? '1px solid rgba(36, 189, 112, 0.25)' : '1px solid rgba(240, 68, 68, 0.25)',
                      }}
                    >
                      {req.status?.toUpperCase()}
                    </span>
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
