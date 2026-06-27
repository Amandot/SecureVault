'use client';

import { useEffect, useRef } from 'react';
import type { WatermarkConfig, ViewerInfo } from '../WatermarkOverlay';

interface WatermarkLayerProps {
  config: WatermarkConfig;
  viewer: ViewerInfo;
  width: number;
  height: number;
}

const FONT_SIZE_MAP = { small: 13, medium: 17, large: 22 };

const COLOR_MAP: Record<string, string> = {
  white: 'rgba(255,255,255,',
  gray: 'rgba(180,180,190,',
  lightblue: 'rgba(100,200,255,',
  red: 'rgba(239,68,68,',
};

function buildLines(fields: string[], customText: string | null | undefined, viewer: ViewerInfo): string[] {
  const now = new Date();
  const lines: string[] = [];

  if (fields.includes('classification')) lines.push('CONFIDENTIAL');
  if (fields.includes('name') && viewer.name) lines.push(`Viewed by: ${viewer.name}`);
  if (fields.includes('email') && viewer.email) lines.push(viewer.email);
  if (fields.includes('date')) lines.push(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
  if (fields.includes('time')) lines.push(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' ' + Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (fields.includes('company') && customText) lines.push(customText);
  if (fields.includes('custom') && customText && !fields.includes('company')) lines.push(customText);

  return lines;
}

function drawWatermark(
  canvas: HTMLCanvasElement,
  config: WatermarkConfig,
  viewer: ViewerInfo,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const fontSize = FONT_SIZE_MAP[config.fontSize] ?? 17;
  const colorBase = COLOR_MAP[config.color] ?? COLOR_MAP.white;
  const alpha = (config.opacity / 100).toFixed(2);
  const fillColor = `${colorBase}${alpha})`;
  const shadowColor = config.color === 'white' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';

  const lines = buildLines(config.fields, config.customText, viewer);
  if (lines.length === 0) return;

  const lineHeight = fontSize * 1.55;
  const blockHeight = lines.length * lineHeight;

  const drawBlock = (cx: number, cy: number, rotation: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = fillColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    lines.forEach((line, i) => {
      const y = (i - (lines.length - 1) / 2) * lineHeight;
      if (i === 0 && config.fields.includes('classification')) {
        ctx.font = `800 ${fontSize + 2}px Inter, system-ui, sans-serif`;
        ctx.fillText(line, 0, y);
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      } else {
        ctx.fillText(line, 0, y);
      }
    });
    ctx.restore();
  };

  const placement = config.placement;

  if (placement === 'diagonal') {
    const tileW = Math.max(config.spacing ?? 220, width * 0.38);
    const tileH = blockHeight + 40;
    const angle = config.rotation;
    const rad = (angle * Math.PI) / 180;
    const diagLen = Math.sqrt(width * width + height * height);
    const numX = Math.ceil(diagLen / tileW) + 2;
    const numY = Math.ceil(diagLen / tileH) + 2;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad * -1); 

    for (let r = -numY; r <= numY; r++) {
      for (let c = -numX; c <= numX; c++) {
        const tx = c * tileW + (r % 2 === 0 ? 0 : tileW / 2);
        const ty = r * tileH;
        drawBlock(tx, ty, 0); 
      }
    }
    ctx.restore();
    return;
  }

  const pad = 24;
  let cx = 0, cy = 0;
  switch (placement) {
    case 'top-left':     cx = pad + 80;          cy = pad + blockHeight / 2;          break;
    case 'top-right':    cx = width - pad - 80;  cy = pad + blockHeight / 2;          break;
    case 'bottom-right': cx = width - pad - 80;  cy = height - pad - blockHeight / 2; break;
    case 'bottom-left':  cx = pad + 80;          cy = height - pad - blockHeight / 2; break;
    case 'center':       cx = width / 2;         cy = height / 2;                     break;
    default:             cx = width / 2;         cy = height / 2;
  }
  drawBlock(cx, cy, placement === 'center' ? config.rotation : 0);
}

export default function WatermarkLayer({ config, viewer, width, height }: WatermarkLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Provide pixel density scale for sharp text on retina screens
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    drawWatermark(canvas, config, viewer);
  }, [config, viewer, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}
    />
  );
}
