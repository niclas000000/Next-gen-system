import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[2px] border border-[#E8E6DF] bg-white px-3 py-1.5 text-sm text-[#111111] placeholder:text-[#8A877F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.52_0.08_200)] focus-visible:ring-offset-0 focus-visible:border-[oklch(0.52_0.08_200)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F2F1EC] read-only:bg-[#F2F1EC]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
