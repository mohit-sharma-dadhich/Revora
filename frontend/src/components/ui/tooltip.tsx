import type { ReactNode } from 'react'

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return <span className="group relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-[#18191b] px-2 py-1 text-[11px] text-slate-200 opacity-0 transition-opacity group-hover:opacity-100">{content}</span></span>
}
