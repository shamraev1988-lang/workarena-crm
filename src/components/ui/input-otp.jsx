import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified OTP input - можно заменить на полноценный позже
const InputOTP = React.forwardRef(({ maxLength, value, onChange, className, children, ...props }, ref) => (
  <div className={cn("flex gap-2", className)} ref={ref}>{children}</div>
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = ({ children, className, ...props }) => (
  <div className={cn("flex gap-2", className)} {...props}>{children}</div>
)

const InputOTPSlot = ({ index, className, ...props }) => (
  <div className={cn("relative flex h-10 w-10 items-center justify-center border border-input rounded text-sm transition-all", className)} {...props} />
)

export { InputOTP, InputOTPGroup, InputOTPSlot }
