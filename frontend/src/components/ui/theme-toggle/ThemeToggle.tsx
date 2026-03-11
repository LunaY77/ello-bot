import { MoonStar, SunMedium } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { cn } from '@/utils/cn';

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

export const ThemeToggle = ({
  className,
  compact = false,
}: ThemeToggleProps) => {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();

  const label = theme === 'dark' ? t('theme.light') : t('theme.dark');

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-11 rounded-md border-border-default bg-surface-2 px-3 text-secondary hover:bg-surface-3 hover:text-primary',
        compact && 'size-11 px-0',
        className,
      )}
      aria-label={t('theme.toggle')}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <SunMedium className="size-4" aria-hidden="true" />
      ) : (
        <MoonStar className="size-4" aria-hidden="true" />
      )}
      {!compact ? (
        <span className="ml-2 text-sm font-medium">{label}</span>
      ) : null}
    </Button>
  );
};
