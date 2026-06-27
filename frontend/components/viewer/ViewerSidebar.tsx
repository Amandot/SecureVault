import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewerSidebarProps {
  pdfDoc: any | null;
  isOpen: boolean;
  currentPage: number;
  onNavigate: (page: number) => void;
}

function Thumbnail({ pdfDoc, pageNum, isActive, onClick }: { pdfDoc: any, pageNum: number, isActive: boolean, onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || rendered) return;

    let isMounted = true;
    
    pdfDoc.getPage(pageNum).then((page: any) => {
      if (!isMounted) return;
      const viewport = page.getViewport({ scale: 0.2 }); // Low res for thumbnail
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      renderTask.promise.then(() => {
        if (isMounted) setRendered(true);
      }).catch((err: any) => {
        if (err.name !== 'RenderingCancelledException') {
          console.error(err);
        }
      });
    });

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isVisible, pdfDoc, pageNum, rendered]);

  return (
    <div 
      ref={containerRef}
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '1 / 1.4',
        background: 'rgba(255,255,255,0.05)',
        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      className="hover:border-white/30"
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          opacity: rendered ? 1 : 0, 
          transition: 'opacity 0.3s' 
        }} 
      />
      {!rendered && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pageNum}</div>
      )}
    </div>
  );
}

export default function ViewerSidebar({ pdfDoc, isOpen, currentPage, onNavigate }: ViewerSidebarProps) {
  const numPages = pdfDoc?.numPages || 0;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -250, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -250, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            width: 250,
            height: '100%',
            background: 'var(--card-bg)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Thumbnails</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {pdfDoc && Array.from({ length: numPages }).map((_, i) => (
              <Thumbnail 
                key={i + 1}
                pdfDoc={pdfDoc}
                pageNum={i + 1}
                isActive={currentPage === i + 1}
                onClick={() => onNavigate(i + 1)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
