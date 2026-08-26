import { motion } from 'framer-motion'
import { BarChart3, ChevronLeft, FlaskConical, Gauge, Lightbulb, Menu, Settings2, Sparkles, X } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Separator } from './components/ui/separator'
import { cn } from './lib/utils'

const navigation = [
  { label: 'Overview', to: '/', icon: Gauge },
  { label: 'Opportunity', to: '/opportunity', icon: Lightbulb },
  { label: 'Experiment', to: '/experiment', icon: FlaskConical },
  { label: 'Results', to: '/results', icon: BarChart3 },
]

function PlaceholderPage({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-3xl">
      <div className="mb-10 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald"><Icon size={15} />{eyebrow}</div>
      <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-lg text-base leading-7 text-muted">{description}</p>
      <Card className="mt-12 max-w-xl border-dashed bg-white/[0.018]"><CardContent className="flex min-h-36 flex-col justify-center"><Badge className="w-fit">Workspace ready</Badge><p className="mt-4 text-sm text-slate-300">Your {eyebrow.toLowerCase()} workspace is ready for the next layer.</p></CardContent></Card>
    </motion.div>
  )
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <>
    {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-[#0d0e0f] px-4 py-5 transition-transform duration-300 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center justify-between px-3"><NavLink to="/" onClick={onClose} className="flex items-center gap-2.5 text-white"><span className="grid size-8 place-items-center rounded-lg bg-emerald text-[#06150f]"><Sparkles size={17} strokeWidth={2.5} /></span><span className="text-lg font-semibold tracking-[-0.04em]">revora</span></NavLink><Button variant="ghost" className="size-8 p-0 lg:hidden" onClick={onClose} aria-label="Close navigation"><X size={17} /></Button></div>
      <div className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#626873]">Workspace</div>
      <nav className="mt-3 space-y-1">{navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-emerald/10 text-emerald' : 'text-muted hover:bg-white/[0.04] hover:text-slate-200')}>{({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} /><span>{label}</span>{isActive && <ChevronLeft className="ml-auto rotate-180" size={14} />}</>}</NavLink>)}</nav>
      <div className="mt-auto"><Separator className="mb-4" /><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-slate-200"><Settings2 size={17} /><span>Settings</span></button><div className="mt-5 flex items-center gap-3 rounded-lg border border-line bg-white/[0.025] p-3"><div className="grid size-8 place-items-center rounded-full bg-[#24332e] text-xs font-semibold text-emerald">AM</div><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">Acme Merchant</p><p className="mt-0.5 text-[11px] text-muted">Growth workspace</p></div></div></div>
    </aside>
  </>
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const current = navigation.find((item) => item.to === location.pathname) ?? navigation[0]
  return <div className="min-h-screen bg-canvas text-slate-100"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="min-h-screen lg:pl-[248px]"><header className="flex h-[72px] items-center justify-between border-b border-line px-5 sm:px-8 lg:px-12"><div className="flex items-center gap-3"><Button variant="ghost" className="size-9 p-0 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></Button><span className="text-sm text-muted">{current.label}</span></div><div className="flex items-center gap-3"><span className="hidden text-xs text-[#626873] sm:inline">Last synced just now</span><div className="size-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div></header><div className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12"><Routes><Route path="/" element={<PlaceholderPage eyebrow="Overview" title="See where growth is hiding." description="Your revenue workspace brings opportunity discovery, experiment control, and measured outcomes into one clear operating view." icon={Gauge} />} /><Route path="/opportunity" element={<PlaceholderPage eyebrow="Opportunity" title="Find the next high-signal move." description="Turn customer purchase patterns into focused, evidence-backed opportunities for your merchant team." icon={Lightbulb} />} /><Route path="/experiment" element={<PlaceholderPage eyebrow="Experiment" title="Test with confidence." description="Design controlled growth experiments with clear guardrails, clean cohorts, and a repeatable operating rhythm." icon={FlaskConical} />} /><Route path="/results" element={<PlaceholderPage eyebrow="Results" title="Measure what moved." description="Read the impact of every experiment with transparent outcomes and decisions grounded in real customer behavior." icon={BarChart3} />} /></Routes></div></main></div>
}

export default App
