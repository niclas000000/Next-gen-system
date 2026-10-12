import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        // Northwind status pills
        default:    "bg-paper-2 border-rule text-ink-3",            // neutral
        ok:         "bg-ok-tint border-ok-line text-ok-ink",        // approved/published/closed
        warn:       "bg-warn-tint border-warn-line text-warn-ink",  // pending/in progress
        risk:       "bg-risk-tint border-risk-line text-risk-ink",  // overdue/rejected
        accent:     "bg-accent-tint border-transparent text-nw-accent",
        secondary:  "bg-paper-2 border-rule text-ink-3",
        destructive:"bg-risk-tint border-risk-line text-risk-ink",
        outline:    "border-rule text-ink-3 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
