interface BadgeProps {
  children: React.ReactNode;
  variant?: 'available' | 'low-stock' | 'out-of-stock' | 'best-price' | 'closest' | 'warning' | 'success' | 'info' | 'error' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantStyles = {
    available: 'bg-[var(--available-bg)] text-[var(--available)] border border-[var(--available)]/20',
    'low-stock': 'bg-[var(--low-stock-bg)] text-[var(--low-stock)] border border-[var(--low-stock)]/20',
    'out-of-stock': 'bg-[var(--out-of-stock-bg)] text-[var(--out-of-stock)] border border-[var(--out-of-stock)]/20',
    'best-price': 'bg-[var(--best-price-bg)] text-[var(--best-price)] border border-[var(--best-price)]/20',
    closest: 'bg-[var(--closest-bg)] text-[var(--closest)] border border-[var(--closest)]/20',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/20',
    success: 'bg-[var(--available-bg)] text-[var(--success)] border border-[var(--success)]/20',
    info: 'bg-[var(--best-price-bg)] text-[var(--info)] border border-[var(--info)]/20',
    error: 'bg-[var(--out-of-stock-bg)] text-[var(--destructive)] border border-[var(--destructive)]/20',
    default: 'bg-[var(--muted)] text-[var(--text-secondary)] border border-[var(--border)]'
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
