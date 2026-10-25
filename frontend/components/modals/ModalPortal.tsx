'use client';

/**
 * ModalPortal — viewport-centered modal shell via React Portal
 *
 * Uses createPortal to mount directly into document.body, completely
 * escaping any parent flex/grid/transform/overflow context.
 *
 * Centering is done with a flex overlay — no top/left/translate tricks
 * that break when a parent element has a CSS transform applied.
 *
 * Usage:
 *   <ModalPortal onClose={onClose} maxWidth={520}>
 *     …content…
 *   </ModalPortal>
 */

import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalPortalProps {
  /** Called when the backdrop is clicked or Escape is pressed */
  onClose: () => void;
  /** Maximum width of the modal panel in px (default 520) */
  maxWidth?: number | string;
  /** Extra class names applied to the inner panel */
  className?: string;
  /** Inner padding (default 32) */
  padding?: number;
  children: ReactNode;
  /** Whether the modal is currently open (controls AnimatePresence) */
  open?: boolean;
}

export default function ModalPortal({
  onClose,
  maxWidth = 520,
  className = 'glass-card',
  padding = 32,
  children,
  open = true,
}: ModalPortalProps) {
  const portalRoot = useRef<HTMLElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Lazy-resolve portal target (SSR-safe)
  if (typeof document === 'undefined') return null;
  portalRoot.current ??= document.body;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Overlay backdrop ──────────────────────────────────────────── */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(24, 43, 58, 0.35)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9000,
            }}
          />

          {/* ── Flex centering wrapper ────────────────────────────────────── */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              pointerEvents: 'none',
            }}
            onClick={onClose}
          >
            {/* ── Modal panel ──────────────────────────────────────────────── */}
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={className}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding,
                pointerEvents: 'auto',
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderRadius: 24,
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 20px 60px rgba(24, 76, 120, 0.18)',
              }}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    portalRoot.current,
  );
}
