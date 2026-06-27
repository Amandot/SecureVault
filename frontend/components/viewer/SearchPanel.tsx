import React, { useState, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchMatch {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SearchPanelProps {
  pdfDoc: any | null;
  isOpen: boolean;
  onClose: () => void;
  onMatchesFound: (matches: SearchMatch[]) => void;
  onNavigateToMatch: (page: number) => void;
}

export default function SearchPanel({ pdfDoc, isOpen, onClose, onMatchesFound, onNavigateToMatch }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setMatches([]);
      onMatchesFound([]);
      setCurrentMatchIndex(-1);
    }
  }, [isOpen, onMatchesFound]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 1 && pdfDoc) {
        performSearch(query);
      } else {
        setMatches([]);
        onMatchesFound([]);
        setCurrentMatchIndex(-1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, pdfDoc]); // eslint-disable-line

  const performSearch = async (searchQuery: string) => {
    if (!pdfDoc) return;
    setIsSearching(true);
    setMatches([]);
    const foundMatches: SearchMatch[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    try {
      const numPages = pdfDoc.numPages;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        let pageText = '';
        const items = textContent.items;
        
        // Simple search: check if string exists in item string. 
        // Note: For a robust implementation, you need to combine all strings and map back to item rects.
        // This is a basic implementation for demonstration that highlights individual text items containing the query.
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (item.str && item.str.toLowerCase().includes(lowerQuery)) {
            // pdf.js transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
            const tx = item.transform;
            const x = tx[4];
            const y = tx[5];
            const w = item.width || (tx[0] * item.str.length); // fallback
            const h = item.height || tx[3];

            // In PDF coordinate system, Y is from bottom.
            // We need to transform it relative to top-left for standard canvas drawing.
            // A more robust implementation would use page.getViewport to transform the coordinates.
            // For now, we store raw PDF coordinates and let DocumentCanvas handle it if possible,
            // or we use page.getViewport here.
            
            const viewport = page.getViewport({ scale: 1 });
            // Convert to viewport coordinates (y is inverted)
            const viewportY = viewport.height - y - h;

            foundMatches.push({
              page: i,
              x: x,
              y: viewportY,
              w: w,
              h: h
            });
          }
        }
      }
      
      setMatches(foundMatches);
      onMatchesFound(foundMatches);
      if (foundMatches.length > 0) {
        setCurrentMatchIndex(0);
        onNavigateToMatch(foundMatches[0].page);
      } else {
        setCurrentMatchIndex(-1);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    onNavigateToMatch(matches[nextIdx].page);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    onNavigateToMatch(matches[prevIdx].page);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            width: 300,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={16} color="var(--accent)" /> Find in Document
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }} className="hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', paddingRight: 40, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}
              autoFocus
            />
            {isSearching && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <Loader2 size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          {query.trim().length > 1 && !isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {matches.length > 0 ? `${currentMatchIndex + 1} / ${matches.length} matches` : 'No matches'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={handlePrev}
                  disabled={matches.length === 0}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: matches.length === 0 ? 'not-allowed' : 'pointer', opacity: matches.length === 0 ? 0.5 : 1, padding: '4px 8px', borderRadius: 4 }}
                >
                  <ChevronUp size={16} />
                </button>
                <button 
                  onClick={handleNext}
                  disabled={matches.length === 0}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: matches.length === 0 ? 'not-allowed' : 'pointer', opacity: matches.length === 0 ? 0.5 : 1, padding: '4px 8px', borderRadius: 4 }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
