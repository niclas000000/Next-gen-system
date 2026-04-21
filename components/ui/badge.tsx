import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        // Northwind status pills
        default:    "bg-[#F2F1EC] border-[#E8E6DF] text-[#54524D]",                                          // neutral
        ok:         "bg-[oklch(0.96_0.04_145)] border-[oklch(0.80_0.08_145)] text-[oklch(0.42_0.12_145)]",  // approved/published
        warn:       "bg-[oklch(0.97_0.04_70)] border-[oklch(0.82_0.10_70)] text-[oklch(0.48_0.14_70)]",     // pending/in-review
        risk:       "bg-[oklch(0.96_0.04_25)] border-[oklch(0.80_0.12_25)] text-[oklch(0.42_0.17_25)]",     // overdue/rejected
        secondary:  "bg-[#F2F1EC] border-[#E8E6DF] text-[#54524D]",
        destructive:"bg-[oklch(0.96_0.04_25)] border-[oklch(0.80_0.12_25)] text-[oklch(0.42_0.17_25)]",
        outline:    "border-[#E8E6DF] text-[#54524D] bg-transparent",
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
