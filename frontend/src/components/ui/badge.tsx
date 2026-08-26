import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full border border-emerald/20 bg-emerald/10 px-2.5 py-1 text-xs font-medium text-emerald', className)} {...props} />
}
