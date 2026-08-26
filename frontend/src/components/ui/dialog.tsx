import type { ReactNode } from 'react'

export function Dialog({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function DialogContent({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-panel p-6 shadow-glow">{children}</div>
}
