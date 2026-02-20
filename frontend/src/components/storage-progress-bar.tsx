import { useTranslation } from 'react-i18next'

export interface StorageProgressBarProps {
  usedBytes: number
  maxBytes: number | null
  className?: string
  /** Optional label (e.g. "Total platform storage") instead of default "Storage used" */
  label?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Color variant based on usage: normal (0-50%), warning (50-80%), danger (80%+) */
function getVariant(percentUsed: number): 'normal' | 'warning' | 'danger' {
  if (percentUsed >= 80) return 'danger'
  if (percentUsed >= 50) return 'warning'
  return 'normal'
}

export function StorageProgressBar({
  usedBytes,
  maxBytes,
  className = '',
  label
}: StorageProgressBarProps) {
  const { t } = useTranslation('common')
  const displayLabel = label ?? t('storageUsed', { defaultValue: 'Storage used' })

  if (maxBytes == null || maxBytes <= 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">
          {displayLabel}:{' '}
          {formatBytes(usedBytes)} ({t('unlimited', { defaultValue: 'Unlimited' })})
        </span>
      </div>
    )
  }

  const percentUsed = Math.min(100, (usedBytes / maxBytes) * 100)
  const variant = getVariant(percentUsed)
  const showWarning = percentUsed >= 80

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {displayLabel}: {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
        </span>
        <span
          className={`font-medium ${
            variant === 'danger'
              ? 'text-destructive'
              : variant === 'warning'
                ? 'text-amber-600 dark:text-amber-500'
                : ''
          }`}
        >
          {percentUsed.toFixed(0)}%
        </span>
      </div>
      <div
        className="storage-progress-track h-2.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`storage-progress-fill storage-progress-fill--${variant} h-full rounded-full transition-all duration-300`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      {showWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          {t('storageLimitWarning', {
            defaultValue: 'Do not take the risk. Increase your storage or contact your administrator.'
          })}
        </p>
      )}
      <style>{`
        .storage-progress-fill--normal {
          background: linear-gradient(
            90deg,
            hsl(var(--primary)) 0%,
            hsl(var(--primary)) 35%,
            rgba(255,255,255,0.35) 50%,
            hsl(var(--primary)) 65%,
            hsl(var(--primary)) 100%
          );
          background-size: 200% 100%;
          animation: storage-flare-shimmer 2.5s ease-in-out infinite;
        }
        .storage-progress-fill--warning {
          background: linear-gradient(
            90deg,
            hsl(38 92% 50%) 0%,
            hsl(38 92% 50%) 35%,
            rgba(255,255,255,0.4) 50%,
            hsl(38 92% 50%) 65%,
            hsl(38 92% 50%) 100%
          );
          background-size: 200% 100%;
          animation: storage-flare-shimmer 2.5s ease-in-out infinite;
        }
        .storage-progress-fill--danger {
          background: linear-gradient(
            90deg,
            hsl(0 84% 60%) 0%,
            hsl(0 84% 60%) 35%,
            rgba(255,255,255,0.4) 50%,
            hsl(0 84% 60%) 65%,
            hsl(0 84% 60%) 100%
          );
          background-size: 200% 100%;
          animation: storage-flare-shimmer 2.5s ease-in-out infinite;
        }
        @keyframes storage-flare-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
