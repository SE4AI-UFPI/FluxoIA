import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-sm border border-fx-linha bg-white px-3 py-2 text-base text-fx-grafite transition-colors placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul focus-visible:border-fx-azul disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
