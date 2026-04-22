import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none';

    const variantStyles = {
      primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] active:bg-[#BF360C]',
      secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] active:bg-[#212121]',
      ghost: 'bg-transparent text-[var(--foreground)] active:bg-[var(--muted)]',
      destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] active:bg-[#B71C1C]'
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-6',
      lg: 'h-14 px-8 text-lg'
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
