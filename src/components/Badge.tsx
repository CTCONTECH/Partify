interface BadgeProps {
  children: React.ReactNode;
  variant?: 'available' | 'low-stock' | 'out-of-stock' | 'best-price' | 'closest' | 'warning' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantStyles = {
    available: 'bg-[var(--available-bg)] text-[var(--available)]',
    'low-stock': 'bg-[var(--low-stock-bg)] text-[var(--low-stock)]',
    'out-of-stock': 'bg-[var(--out-of-stock-bg)] text-[var(--out-of-stock)]',
    'best-price': 'bg-[var(--best-price-bg)] text-[var(--best-price)]',
    closest: 'bg-[var(--closest-bg)] text-[var(--closest)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    default: 'bg-[var(--muted)] text-[var(--muted-foreground)]'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
