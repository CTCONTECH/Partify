import { Search, X } from 'lucide-react';
import { InputHTMLAttributes, forwardRef } from 'react';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showClear?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onClear, showClear, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
        <input
          ref={ref}
          className={`
            w-full h-12 pl-12 pr-12 bg-[var(--input-background)] border border-[var(--border)]
            rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
            ${className}
          `}
          {...props}
        />
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] active:text-[var(--foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
