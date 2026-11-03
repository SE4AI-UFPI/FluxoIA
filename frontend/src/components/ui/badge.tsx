import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-fx-azul text-fx-papel',
        secondary: 'border-fx-linha bg-fx-nevoa text-fx-marinho',
        success: 'border-transparent bg-fx-sucesso text-fx-papel',
        warning: 'border-transparent bg-fx-alerta text-fx-papel',
        outline: 'border-fx-linha text-fx-cinza bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
