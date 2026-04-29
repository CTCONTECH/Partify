interface Option {
  value: string;
  label: string;
  featured?: boolean;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex bg-[var(--muted)] rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-2 rounded-md text-sm transition-all
            ${value === option.value
              ? option.featured
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)]'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
