'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import WatermarkLayer from './WatermarkLayer';
import type { WatermarkConfig, ViewerInfo } from '../WatermarkOverlay';

interface SearchMatch {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DocumentCanvasProps {
  page: PDFPageProxy | null;
  pageNum: number;
  zoom: number;
  rotation: number;
  watermarkConfig?: WatermarkConfig | null;
  viewerInfo: ViewerInfo;
  searchMatches?: SearchMatch[];
}

export default function DocumentCanvas({
  page,
  pageNum,
  zoom,
  rotation,
  watermarkConfig,
  viewerInfo,
  searchMatches = [],
}: DocumentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  // Compute viewport
  const viewport = page?.getViewport({ scale: zoom, rotation: page.rotate + rotation });
  const width = viewport?.width || 800;
  const height = viewport?.height || 1000;

  useEffect(() => {
    if (!page || !viewport) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for sharp rendering
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    // Cancel any ongoing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);
    renderTaskRef.current = renderTask;

    renderTask.promise.then(() => {
      setRendered(true);
      renderTaskRef.current = null;
    }).catch((err: any) => {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    });

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [page, zoom, rotation]); // Re-render when page, zoom or rotation changes

  // Draw highlights
  useEffect(() => {
    if (!highlightCanvasRef.current || !viewport || !rendered) return;
    const canvas = highlightCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    if (searchMatches.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
      searchMatches.forEach(match => {
        // match rects are computed in viewport coordinates by SearchPanel
        ctx.fillRect(match.x, match.y, match.w, match.h);
      });
    }
  }, [searchMatches, rendered, zoom, rotation]);

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: `${width}px`, 
        height: `${height}px`,
        background: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: 24,
        margin: '0 auto 24px auto',
      }}
      className="pdf-page-container"
      data-page-num={pageNum}
    >
      {!rendered && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
          <div className="loader" style={{ width: 30, height: 30, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* PDF Content */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Highlights */}
      <canvas
        ref={highlightCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Watermark Overlay */}
      {watermarkConfig && (
        <WatermarkLayer
          config={watermarkConfig}
          viewer={viewerInfo}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}
