import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PageNavigator({ currentPage, totalPages, onPageChange }: PageNavigatorProps) {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let page = parseInt(inputValue, 10);
      if (isNaN(page)) {
        setInputValue(currentPage.toString());
        return;
      }
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      onPageChange(page);
    }
  };

  const handleBlur = () => {
    setInputValue(currentPage.toString());
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8 }}>
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        style={{ background: 'none', border: 'none', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.3 : 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: 2 }}
      >
        <ChevronUp size={16} />
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{ width: 40, height: 24, textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13 }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/ {totalPages}</span>
      </div>

      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        style={{ background: 'none', border: 'none', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.3 : 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: 2 }}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
