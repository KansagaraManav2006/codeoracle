import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: { current: number; total: number; unit?: string };
  id?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'Search module path or symbol name…',
  resultCount,
  id = 'search-input',
  className = '',
  autoFocus = false,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>

      <div className="relative w-full flex items-center">
        <Search
          className="absolute left-3 w-4 h-4 text-ink-3 pointer-events-none shrink-0"
          strokeWidth={1.75}
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-9 pl-9 pr-8 bg-tile text-ink text-[13px] placeholder-ink-3 rounded-pill border border-line focus:bg-surface focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent transition-colors duration-fast"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-1 rounded-full text-ink-3 hover:text-ink hover:bg-panel transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {resultCount && (
        <span className="sr-only" aria-live="polite">
          {resultCount.current} of {resultCount.total} {resultCount.unit || 'files'} shown
        </span>
      )}
    </div>
  );
};

export default SearchField;
