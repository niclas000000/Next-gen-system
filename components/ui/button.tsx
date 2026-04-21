import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Northwind: ink fill — the primary commit action
        default:
          "bg-[#111111] text-white hover:bg-[#2d2d2d] rounded-[2px]",
        // Danger: risk tint
        destructive:
          "bg-[oklch(0.96_0.04_25)] border border-[oklch(0.56_0.17_25)] text-[oklch(0.42_0.17_25)] hover:bg-[oklch(0.93_0.06_25)] rounded-[2px]",
        // Default/secondary: surface with rule border
        outline:
          "bg-white border border-[#E8E6DF] text-[#111111] hover:bg-[#F2F1EC] rounded-[2px]",
        secondary:
          "bg-[#F2F1EC] border border-[#E8E6DF] text-[#54524D] hover:bg-[#E8E6DF] rounded-[2px]",
        // Ghost: no border
        ghost:
          "text-[#54524D] hover:bg-[#F2F1EC] hover:text-[#111111] rounded-[2px]",
        link:
          "text-[oklch(0.52_0.08_200)] underline-offset-4 hover:underline",
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
