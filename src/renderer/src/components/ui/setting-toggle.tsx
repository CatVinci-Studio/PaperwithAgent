import { cn } from '@/lib/utils'

interface SettingToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function SettingToggle({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
  className,
}: SettingToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/40',
        checked ? 'bg-[var(--accent-color)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-color)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-150',
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  )
}
