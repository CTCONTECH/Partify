import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-xl
      transition-all duration-150 ease-in-out
      disabled:opacity-50 disabled:pointer-events-none
      active:scale-[0.98]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2
    `.replace(/\s+/g, ' ').trim();

    const variantStyles = {
      primary: `
        bg-gradient-to-br from-[var(--primary)] to-[#D84315]
        text-white font-semibold
        shadow-md hover:shadow-lg
        hover:from-[#FF6E40] hover:to-[#F4511E]
      `.replace(/\s+/g, ' ').trim(),

      secondary: `
        bg-white text-[var(--text-primary)]
        border border-[var(--border)]
        hover:bg-[var(--muted)]
        shadow-sm
      `.replace(/\s+/g, ' ').trim(),

      outline: `
        bg-transparent
        border-2 border-[var(--border)]
        text-[var(--text-primary)]
        hover:bg-[var(--muted)]
        hover:border-[var(--border-strong)]
      `.replace(/\s+/g, ' ').trim(),

      ghost: `
        bg-transparent
        text-[var(--primary)]
        hover:bg-[var(--brand-primary-50)]
      `.replace(/\s+/g, ' ').trim(),

      destructive: `
        bg-[var(--destructive)] text-white
        hover:bg-[#D32F2F]
        shadow-sm
      `.replace(/\s+/g, ' ').trim()
    };

    const sizeStyles = {
      sm: 'h-9 px-4 py-2 text-sm gap-2',
      md: 'h-11 px-6 py-3 text-base gap-2',
      lg: 'h-14 px-8 py-4 text-lg gap-3'
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
