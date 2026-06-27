import React from 'react';
import { Shield, Search, PanelLeft, Download, Printer, X, Maximize, RotateCw } from 'lucide-react';
import PageNavigator from './PageNavigator';
import ZoomControls from './ZoomControls';
import PermissionGuard from './PermissionGuard';
import { motion } from 'framer-motion';

interface ViewerToolbarProps {
  filename: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  canDownload: boolean;
  searchOpen: boolean;
  sidebarOpen: boolean;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onRotate: () => void;
  onToggleSearch: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onClose: () => void;
}

export default function ViewerToolbar({
  filename,
  currentPage,
  totalPages,
  zoom,
  canDownload,
  searchOpen,
  sidebarOpen,
  onPageChange,
  onZoomChange,
  onFitWidth,
  onFitPage,
  onRotate,
  onToggleSearch,
  onToggleSidebar,
  onToggleFullscreen,
  onDownload,
  onPrint,
  onClose
}: ViewerToolbarProps) {
  return (
    <motion.div 
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        height: 56,
        background: 'rgba(10, 15, 25, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <button 
          onClick={onToggleSidebar}
          style={{ background: sidebarOpen ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center' }}
          className="hover:bg-white/10 transition-colors"
        >
          <PanelLeft size={20} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #0099cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={14} color="#000" />
          </div>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }} title={filename}>
            {filename}
          </span>
        </div>
      </div>

      {/* Center section - Navigation & Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <PageNavigator 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <ZoomControls 
          zoom={zoom}
          onZoomChange={onZoomChange}
          onFitWidth={onFitWidth}
          onFitPage={onFitPage}
        />
      </div>

      {/* Right section - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
        <button 
          onClick={onRotate}
          title="Rotate"
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          className="hover:bg-white/10 transition-colors"
        >
          <RotateCw size={18} />
        </button>
        
        <button 
          onClick={onToggleSearch}
          title="Search"
          style={{ background: searchOpen ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          className="hover:bg-white/10 transition-colors"
        >
          <Search size={18} />
        </button>

        <button 
          onClick={onToggleFullscreen}
          title="Fullscreen"
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          className="hover:bg-white/10 transition-colors"
        >
          <Maximize size={18} />
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />

        <PermissionGuard canDownload={canDownload} blocked={true}>
          <button 
            onClick={onPrint}
            title="Print"
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            className="hover:bg-white/10 transition-colors"
          >
            <Printer size={18} />
          </button>
          
          <button 
            onClick={onDownload}
            title="Download"
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            className="hover:bg-white/10 transition-colors"
          >
            <Download size={18} />
          </button>
        </PermissionGuard>

        <button 
          onClick={onClose}
          title="Close Viewer"
          style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', cursor: 'pointer', padding: 8, borderRadius: 8, marginLeft: 8 }}
          className="hover:bg-red-500/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
