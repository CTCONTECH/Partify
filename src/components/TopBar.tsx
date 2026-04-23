import { ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PartifyLogo } from './PartifyLogo';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showLogo?: boolean;
  onBack?: () => void;
}

export function TopBar({
  title,
  showBack,
  showNotifications,
  showLogo = false,
  onBack
}: TopBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--card)] border-b border-[var(--border)] safe-area-inset-top backdrop-blur-sm bg-opacity-95">
      <div className="flex items-center justify-between h-16 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-[var(--text-primary)] hover:text-[var(--primary)] active:scale-95 transition-all rounded-lg hover:bg-[var(--muted)]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          {showLogo ? (
            <PartifyLogo variant="horizontal" size="md" />
          ) : title && (
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
          )}
        </div>
        {showNotifications && (
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--primary)] active:scale-95 transition-all rounded-lg hover:bg-[var(--muted)]"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6" />
          </button>
        )}
      </div>
    </header>
  );
}
