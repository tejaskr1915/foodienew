import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export const SearchBar = ({
  placeholder = "Search...",
  value = "",
  onChange,
  className = "",
  style = {},
  disabled = false,
  suggestions = [],
  data = [],
  onSelectSuggestion
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Extract raw string suggestions
  const rawList = Array.isArray(suggestions) && suggestions.length > 0
    ? suggestions
    : (Array.isArray(data) ? data.map(item => typeof item === 'string' ? item : (item?.name || item?.title || item?.code || item?.id || '')) : []);

  // Filter unique suggestions matching search value
  const query = String(value || '').trim().toLowerCase();
  const matchingSuggestions = query.length > 0 && !disabled
    ? Array.from(new Set(rawList.filter(Boolean).map(s => String(s).trim()))).filter(item =>
        item.toLowerCase().includes(query)
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion) => {
    if (onChange) onChange(suggestion);
    if (onSelectSuggestion) onSelectSuggestion(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen || matchingSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && matchingSuggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < matchingSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : matchingSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < matchingSuggestions.length) {
        e.preventDefault();
        handleSelect(matchingSuggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const renderHighlight = (text, matchQuery) => {
    if (!matchQuery) return text;
    const parts = text.split(new RegExp(`(${matchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === matchQuery.toLowerCase() ? (
        <strong key={i} className="text-danger fw-bold">{part}</strong>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={`position-relative ${className}`} style={{ ...style, minWidth: '160px' }}>
      <FiSearch 
        className="position-absolute top-50 start-0 translate-middle-y ms-3" 
        style={{ color: disabled ? '#94a3b8' : 'var(--primary-color)', zIndex: 3 }}
        size={18} 
      />
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className="form-control rounded-pill py-2.5 ps-5 pe-5 text-secondary border border-light-subtle shadow-sm"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (query.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        style={{ 
          fontSize: '13px', 
          backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.75 : 1
        }}
        autoComplete="off"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            if (onChange) onChange('');
            setIsOpen(false);
            if (inputRef.current) inputRef.current.focus();
          }}
          className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-1 text-secondary text-decoration-none border-0 bg-transparent"
          style={{ cursor: 'pointer', zIndex: 3 }}
          aria-label="Clear search"
        >
          <FiX size={16} />
        </button>
      )}

      {/* Autocomplete Suggestion Dropdown */}
      {isOpen && matchingSuggestions.length > 0 && (
        <div 
          className="position-absolute start-0 w-100 mt-1 bg-white border border-light-subtle rounded-4 shadow-lg overflow-hidden py-1"
          style={{ zIndex: 1050, maxHeight: '240px', overflowY: 'auto' }}
        >
          <div className="px-3 py-1.5 text-muted small fw-semibold border-bottom bg-light d-flex align-items-center justify-content-between" style={{ fontSize: '10.5px' }}>
            <span>SUGGESTIONS</span>
            <span>{matchingSuggestions.length} found</span>
          </div>
          {matchingSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer transition-all ${
                highlightedIndex === idx ? 'bg-danger-subtle text-danger' : 'text-dark hover-bg-light'
              }`}
              style={{ fontSize: '12.5px', cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-2 text-truncate">
                <FiSearch size={13} className="text-secondary opacity-75 flex-shrink-0" />
                <span className="text-truncate">{renderHighlight(suggestion, query)}</span>
              </div>
              <span className="text-muted small ms-2" style={{ fontSize: '10px' }}>Select ↵</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
