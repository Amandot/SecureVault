'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ViewerToolbar from './ViewerToolbar';
import ViewerSidebar from './ViewerSidebar';
import SearchPanel, { type SearchMatch } from './SearchPanel';
import DocumentCanvas from './DocumentCanvas';
import type { WatermarkConfig, ViewerInfo } from '../WatermarkOverlay';

// Initialize PDF.js worker using CDN to avoid Next.js bundling issues with the worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SecurePdfViewerProps {
  pdfBuffer: ArrayBuffer | Uint8Array;
  filename: string;
  canDownload: boolean;
  watermarkConfig?: WatermarkConfig | null;
  viewerInfo: ViewerInfo;
  onClose: () => void;
}

// A wrapper for a single page that only mounts DocumentCanvas when near the viewport
function PageContainer({ 
  pdfDoc, 
  pageNum, 
  zoom, 
  rotation, 
  watermarkConfig, 
  viewerInfo, 
  searchMatches,
  onVisible
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageProxy, setPageProxy] = useState<any>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1 / 1.414); // Default A4 approx

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          onVisible(pageNum);
        }
      },
      { rootMargin: '800px 0px' } // Load pages 800px before they come into view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, onVisible]);

  useEffect(() => {
    let isMounted = true;
    if (isVisible && !pageProxy) {
      pdfDoc.getPage(pageNum).then((page: any) => {
        if (!isMounted) return;
        setPageProxy(page);
        const vp = page.getViewport({ scale: 1, rotation: page.rotate });
        setAspectRatio(vp.width / vp.height);
      }).catch((e: any) => console.error("Error loading page:", e));
    }
    return () => { isMounted = false; };
  }, [isVisible, pageProxy, pdfDoc, pageNum]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center',
        minHeight: isVisible ? 'auto' : `${800 * zoom}px`, 
        aspectRatio: isVisible ? 'auto' : aspectRatio,
        marginBottom: 24
      }}
      id={`pdf-page-${pageNum}`}
    >
      {isVisible && pageProxy ? (
        <DocumentCanvas
          page={pageProxy}
          pageNum={pageNum}
          zoom={zoom}
          rotation={rotation}
          watermarkConfig={watermarkConfig}
          viewerInfo={viewerInfo}
          searchMatches={searchMatches}
        />
      ) : (
        <div style={{ width: '100%', maxWidth: `${800 * zoom}px`, background: 'rgba(255,255,255,0.02)' }} />
      )}
    </div>
  );
}

export default function SecurePdfViewer({
  pdfBuffer,
  filename,
  canDownload,
  watermarkConfig,
  viewerInfo,
  onClose
}: SecurePdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize PDF.js
  useEffect(() => {
    if (!pdfBuffer) return;

    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    
    let isMounted = true;
    loadingTask.promise.then((pdf) => {
      if (!isMounted) return;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
    }).catch(err => {
      if (err?.message?.includes('Worker was destroyed')) return;
      console.error("Error loading PDF document:", err);
    });

    // Cleanup: destroy doc
    return () => {
      isMounted = false;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
      }
    };
  }, [pdfBuffer]);

  const handlePageNavigate = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById(`pdf-page-${page}`);
    if (el && containerRef.current) {
      // Scroll smoothly to the page
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleVisiblePage = useCallback((pageNum: number) => {
    // Only update if we're not currently jumping via scrollIntoView to prevent jumping around
    // For simplicity, we just update it. A better implementation tracks scroll intent.
    setCurrentPage((prev) => {
      // Small heuristic: only update if it's a small jump (scrolling) to avoid bouncing
      if (Math.abs(prev - pageNum) <= 2) return pageNum;
      return prev; 
    });
  }, []);

  const handleFitWidth = () => {
    if (!containerRef.current) return;
    // Estimate width based on container, leaving room for sidebar and padding
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    // Assuming standard A4 width is ~800 at scale 1
    setZoom(containerWidth / 800);
  };

  const handleFitPage = () => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.clientHeight - 48;
    // Assuming standard A4 height is ~1130 at scale 1
    setZoom(containerHeight / 1130);
  };

  const handleDownload = () => {
    if (!canDownload || !pdfBuffer) return;
    const blob = new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handlePrint = () => {
    if (!canDownload || !pdfBuffer) return;
    const blob = new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.contentWindow?.print();
    // Cleanup handled later
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  if (!pdfDoc) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-bg)' }}>
        <div className="loader" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--primary-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ViewerToolbar 
        filename={filename}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        canDownload={canDownload}
        searchOpen={searchOpen}
        sidebarOpen={sidebarOpen}
        onPageChange={handlePageNavigate}
        onZoomChange={setZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onRotate={() => setRotation(r => (r + 90) % 360)}
        onToggleSearch={() => setSearchOpen(!searchOpen)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleFullscreen={handleToggleFullscreen}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onClose={onClose}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <ViewerSidebar 
          pdfDoc={pdfDoc}
          isOpen={sidebarOpen}
          currentPage={currentPage}
          onNavigate={handlePageNavigate}
        />
        
        <div 
          ref={containerRef}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            background: 'var(--primary-bg)',
            padding: '24px',
            position: 'relative'
          }}
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <PageContainer
              key={i + 1}
              pdfDoc={pdfDoc}
              pageNum={i + 1}
              zoom={zoom}
              rotation={rotation}
              watermarkConfig={watermarkConfig}
              viewerInfo={viewerInfo}
              searchMatches={searchMatches.filter(m => m.page === i + 1)}
              onVisible={handleVisiblePage}
            />
          ))}
        </div>

        <SearchPanel 
          pdfDoc={pdfDoc}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onMatchesFound={setSearchMatches}
          onNavigateToMatch={handlePageNavigate}
        />
      </div>
    </div>
  );
}
