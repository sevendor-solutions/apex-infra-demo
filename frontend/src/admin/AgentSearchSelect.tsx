import React, { useState, useRef, useEffect } from 'react';
import type { MarketingAgent } from '../types';
import { User, ChevronDown, Check, X } from 'lucide-react';

interface AgentSearchSelectProps {
  agents: MarketingAgent[];
  value: string;
  onChange: (agentName: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dropUp?: boolean;
}

export const AgentSearchSelect: React.FC<AgentSearchSelectProps> = ({
  agents = [],
  value,
  onChange,
  placeholder = "Search or type agent name...",
  className,
  style,
  dropUp
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [isDropUp, setIsDropUp] = useState(dropUp || false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const updateDropPosition = () => {
    if (dropUp !== undefined) {
      setIsDropUp(dropUp);
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 240) {
        setIsDropUp(true);
      } else {
        setIsDropUp(false);
      }
    }
  };

  const handleOpen = () => {
    updateDropPosition();
    setIsOpen(true);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAgents = agents.filter(a => {
    if (!query.trim()) return true; // Show ALL agents when empty search query
    const q = query.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  const handleSelect = (agentName: string) => {
    onChange(agentName);
    setQuery(agentName);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className="agent-search-select-container" style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        className={`input-with-icon ${className || ''}`}
        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <User size={16} className="input-icon" style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none', zIndex: 2 }} />
        
        <input
          type="text"
          className="form-control-premium"
          style={{ width: '100%', paddingLeft: '34px', paddingRight: '34px', borderRadius: '6px' }}
          placeholder={placeholder}
          value={query}
          onFocus={handleOpen}
          onClick={handleOpen}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
            handleOpen();
          }}
          autoComplete="off"
        />

        <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2 }}>
          {query && (
            <button 
              type="button" 
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            style={{ 
              color: '#64748b', 
              cursor: 'pointer',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
            onClick={() => {
              if (isOpen) setIsOpen(false);
              else handleOpen();
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div 
          className="agent-search-dropdown-menu"
          style={{
            position: 'absolute',
            ...(isDropUp 
              ? { bottom: '100%', marginBottom: '4px' } 
              : { top: '100%', marginTop: '4px' }
            ),
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: isDropUp 
              ? '0 -8px 20px rgba(0,0,0,0.1)'
              : '0 8px 20px rgba(0,0,0,0.1)',
            maxHeight: '210px',
            overflowY: 'auto',
            zIndex: 99999,
            padding: '2px'
          }}
        >
          {filteredAgents.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
              No matching agents found.
            </div>
          ) : (
            filteredAgents.map((a, idx) => {
              const isSelected = value === a.name;
              return (
                <div
                  key={a.id || idx}
                  onMouseDown={() => handleSelect(a.name)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: idx === filteredAgents.length - 1 ? 'none' : '1px solid #f1f5f9',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {a.name}
                    </div>
                    {a.phone && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {a.phone}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check size={16} style={{ color: '#2563eb' }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
