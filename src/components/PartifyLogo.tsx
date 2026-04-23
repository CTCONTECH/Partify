interface PartifyLogoProps {
  variant?: 'icon' | 'horizontal' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'color' | 'white' | 'black';
  className?: string;
}

export function PartifyLogo({
  variant = 'horizontal',
  size = 'md',
  theme = 'color',
  className = ''
}: PartifyLogoProps) {
  // Consistent size system:
  // sm (18-20px): Compact contexts
  // md (22-26px): Top navigation bars
  // lg (34-40px): Auth headers
  // xl (56-64px): Splash/hero
  const sizeClasses = {
    icon: {
      sm: 'w-5 h-5',      // 20px
      md: 'w-6 h-6',      // 24px
      lg: 'w-10 h-10',    // 40px
      xl: 'w-16 h-16',    // 64px
    },
    horizontal: {
      sm: 'h-5',          // 20px
      md: 'h-6',          // 24px
      lg: 'h-10',         // 40px
      xl: 'h-16',         // 64px
    },
    stacked: {
      sm: 'h-16',         // Total height ~64px
      md: 'h-20',         // Total height ~80px
      lg: 'h-28',         // Total height ~112px
      xl: 'h-40',         // Total height ~160px
    },
  };

  const getColors = () => {
    if (theme === 'white') {
      return { primary: '#FFFFFF', secondary: '#FFFFFF' };
    }
    if (theme === 'black') {
      return { primary: '#1A1A1A', secondary: '#1A1A1A' };
    }
    return { primary: '#FF5722', secondary: '#D84315' };
  };

  const colors = getColors();
  const iconDetailColor = theme === 'white' ? '#FF5722' : '#FFFFFF';

  // Icon Only - P-Pin Mark
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses.icon[size]} ${className}`}
        aria-label="Partify"
      >
        <defs>
          <linearGradient id="partify-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>

        {/* Location Pin Shape */}
        <path
          d="M50 10 C65 10, 75 20, 75 35 C75 55, 50 85, 50 85 C50 85, 25 55, 25 35 C25 20, 35 10, 50 10 Z"
          fill={theme === 'color' ? 'url(#partify-gradient)' : colors.primary}
        />

        {/* "P" Letter Inside */}
        <path
          d="M42 28 L50 28 C56 28, 60 32, 60 38 C60 44, 56 48, 50 48 L45 48 L45 58 L42 58 Z M45 31 L45 45 L50 45 C54 45, 57 42, 57 38 C57 34, 54 31, 50 31 Z"
          fill={iconDetailColor}
        />

        {/* Center Dot */}
        <circle cx="50" cy="70" r="3" fill={iconDetailColor} />
      </svg>
    );
  }

  // Horizontal Lockup
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${sizeClasses.horizontal[size]} ${className}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-auto"
        >
          <defs>
            <linearGradient id="partify-gradient-h" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
          </defs>
          <path
            d="M50 10 C65 10, 75 20, 75 35 C75 55, 50 85, 50 85 C50 85, 25 55, 25 35 C25 20, 35 10, 50 10 Z"
            fill={theme === 'color' ? 'url(#partify-gradient-h)' : colors.primary}
          />
          <path
            d="M42 28 L50 28 C56 28, 60 32, 60 38 C60 44, 56 48, 50 48 L45 48 L45 58 L42 58 Z M45 31 L45 45 L50 45 C54 45, 57 42, 57 38 C57 34, 54 31, 50 31 Z"
            fill={iconDetailColor}
          />
          <circle cx="50" cy="70" r="3" fill={iconDetailColor} />
        </svg>

        <span
          className="font-semibold tracking-tight"
          style={{
            fontSize: size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : size === 'lg' ? '1.5rem' : '2rem',
            color: colors.primary
          }}
        >
          partify
        </span>
      </div>
    );
  }

  // Stacked Lockup
  return (
    <div className={`flex flex-col items-center gap-2 ${sizeClasses.stacked[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-2/3 w-auto"
      >
        <defs>
          <linearGradient id="partify-gradient-s" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>
        <path
          d="M50 10 C65 10, 75 20, 75 35 C75 55, 50 85, 50 85 C50 85, 25 55, 25 35 C25 20, 35 10, 50 10 Z"
          fill={theme === 'color' ? 'url(#partify-gradient-s)' : colors.primary}
        />
        <path
          d="M42 28 L50 28 C56 28, 60 32, 60 38 C60 44, 56 48, 50 48 L45 48 L45 58 L42 58 Z M45 31 L45 45 L50 45 C54 45, 57 42, 57 38 C57 34, 54 31, 50 31 Z"
          fill={iconDetailColor}
        />
        <circle cx="50" cy="70" r="3" fill={iconDetailColor} />
      </svg>

      <span
        className="font-semibold tracking-tight"
        style={{
          fontSize: size === 'sm' ? '0.875rem' : size === 'md' ? '1rem' : size === 'lg' ? '1.25rem' : '1.5rem',
          color: colors.primary
        }}
      >
        partify
      </span>
    </div>
  );
}
