import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline'
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald/50 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-emerald text-[#06150f] hover:bg-emerald/90',
        variant === 'ghost' && 'text-muted hover:bg-white/[0.05] hover:text-white',
        variant === 'outline' && 'border border-line bg-transparent text-slate-200 hover:bg-white/[0.05]',
        className,
      )}
      {...props}
    />
  )
}
