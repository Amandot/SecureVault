import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Expand, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function ZoomControls({ zoom, onZoomChange, onFitWidth, onFitPage }: ZoomControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleZoomIn = () => {
    const nextPreset = ZOOM_PRESETS.find(p => p > zoom) || ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
    onZoomChange(nextPreset);
  };

  const handleZoomOut = () => {
    const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < zoom) || ZOOM_PRESETS[0];
    onZoomChange(prevPreset);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 8 }}>
      <button 
        onClick={handleZoomOut}
        disabled={zoom <= ZOOM_PRESETS[0]}
        style={{ background: 'none', border: 'none', cursor: zoom <= ZOOM_PRESETS[0] ? 'not-allowed' : 'pointer', opacity: zoom <= ZOOM_PRESETS[0] ? 0.3 : 1, color: 'var(--text-primary)', padding: 4, borderRadius: 4 }}
      >
        <ZoomOut size={16} />
      </button>

      <div style={{ position: 'relative' }} ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, minWidth: 60 }}
          className="hover:bg-white/10 transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: 120 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button 
                  onClick={() => { onFitWidth(); setIsOpen(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                  className="hover:bg-white/10 transition-colors"
                >
                  <Expand size={14} /> Fit Width
                </button>
                <button 
                  onClick={() => { onFitPage(); setIsOpen(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                  className="hover:bg-white/10 transition-colors"
                >
                  <Maximize size={14} /> Fit Page
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                {ZOOM_PRESETS.reverse().map(preset => (
                  <button 
                    key={preset}
                    onClick={() => { onZoomChange(preset); setIsOpen(false); }}
                    style={{ background: preset === zoom ? 'var(--accent-dim)' : 'none', border: 'none', color: preset === zoom ? 'var(--accent)' : 'var(--text-primary)', fontSize: 13, cursor: 'pointer', padding: '6px 12px', textAlign: 'left', borderRadius: 4 }}
                    className="hover:bg-white/10 transition-colors"
                  >
                    {preset * 100}%
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button 
        onClick={handleZoomIn}
        disabled={zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
        style={{ background: 'none', border: 'none', cursor: zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1] ? 'not-allowed' : 'pointer', opacity: zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1] ? 0.3 : 1, color: 'var(--text-primary)', padding: 4, borderRadius: 4 }}
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
