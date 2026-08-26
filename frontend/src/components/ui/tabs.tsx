import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Tabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col', className)} {...props} />
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex w-fit items-center gap-1 rounded-lg border border-line bg-white/[0.025] p-1', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('rounded-md px-3 py-1.5 text-xs text-muted transition-colors hover:text-white', className)} {...props} />
}
