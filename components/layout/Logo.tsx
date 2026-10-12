import { cn } from '@/lib/utils'

/** Nexus mark: three linked nodes — documents, processes and cases meeting in one point. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="4" fill="var(--nw-accent)" />
      <g stroke="var(--on-fill)" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M9 23 L16 15 L23 23" />
        <path d="M16 15 V8.5" />
      </g>
      <g fill="var(--on-fill)">
        <circle cx="16" cy="15" r="2.6" />
        <circle cx="9" cy="23" r="2" />
        <circle cx="23" cy="23" r="2" />
        <circle cx="16" cy="8" r="2" />
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-[15px] font-semibold tracking-tight text-ink">Nexus</span>
    </span>
  )
}
