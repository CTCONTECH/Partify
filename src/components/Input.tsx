import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm mb-2 text-[var(--foreground)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-12 px-4 bg-[var(--input-background)] border border-[var(--border)]
              rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-[var(--destructive)]' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-[var(--destructive)] mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
