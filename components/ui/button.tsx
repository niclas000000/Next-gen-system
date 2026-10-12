import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent focus-visible:ring-offset-1 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Northwind: ink fill — the primary commit action
        default:
          "bg-ink text-paper hover:bg-ink-2 rounded-[2px]",
        // Danger: risk tint
        destructive:
          "bg-risk-tint border border-risk text-risk-ink hover:border-risk-ink rounded-[2px]",
        // Default/secondary: surface with rule border
        outline:
          "bg-surface border border-rule text-ink hover:bg-paper-2 rounded-[2px]",
        secondary:
          "bg-paper-2 border border-rule text-ink-3 hover:bg-paper-3 rounded-[2px]",
        // Ghost: no border
        ghost:
          "text-ink-3 hover:bg-paper-2 hover:text-ink rounded-[2px]",
        link:
          "text-nw-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] px-3.5 py-1.5",
        sm:      "h-7 px-2.5 py-1 text-xs",
        lg:      "h-10 px-5",
        icon:    "h-[34px] w-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
