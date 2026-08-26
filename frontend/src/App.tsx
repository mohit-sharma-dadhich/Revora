import { motion } from 'framer-motion'
import { BarChart3, BrainCircuit, ChevronLeft, CircleDollarSign, FlaskConical, Gauge, GitBranch, Lightbulb, Menu, Network, Scale, Settings2, Sparkles, X } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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

const pipelineStages = [
  { label: 'Merchant Data', icon: Network },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'AI Agent', icon: BrainCircuit },
  { label: 'Guardrails', icon: Scale },
  { label: 'Experiment', icon: FlaskConical },
  { label: 'Razorpay Test Mode', icon: CircleDollarSign },
  { label: 'Measurement', icon: GitBranch },
  { label: 'SCALE / STOP', icon: Gauge },
]

function ArchitectureDiagram() {
  const desktopPoints = pipelineStages.map((_, index) => ({ x: 76 + index * 151, y: 78 }))
  const mobilePoints = pipelineStages.map((_, index) => ({ x: 160, y: 40 + index * 101 }))

  return (
    <div className="relative mt-14 overflow-hidden rounded-xl border border-line bg-[#0d0e0f] p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#626873]"><span>Revenue operating loop</span><span className="flex items-center gap-2 text-emerald"><span className="size-1.5 rounded-full bg-emerald" />Live path</span></div>
      <svg className="hidden h-auto w-full md:block" viewBox="0 0 1200 160" role="img" aria-label="Revora revenue growth pipeline">
        <motion.path d={`M ${desktopPoints.map((point) => `${point.x},${point.y}`).join(' L ')}`} fill="none" stroke="rgba(16,185,129,0.25)" strokeWidth="2" strokeDasharray="5 7" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1, delay: 0.35 }} />
        {pipelineStages.map(({ label, icon: Icon }, index) => { const point = desktopPoints[index]; return <motion.g key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }}><circle cx={point.x} cy={point.y} r="27" fill={index === pipelineStages.length - 1 ? '#0d2d24' : '#151719'} stroke={index === pipelineStages.length - 1 ? '#10b981' : 'rgba(255,255,255,0.14)'} strokeWidth="1.5" /><foreignObject x={point.x - 12} y={point.y - 12} width="24" height="24"><div className="grid h-6 w-6 place-items-center text-emerald"><Icon size={17} /></div></foreignObject><text x={point.x} y="132" textAnchor="middle" fill={index === pipelineStages.length - 1 ? '#10b981' : '#a4aab3'} fontSize="11" fontWeight={index === pipelineStages.length - 1 ? '600' : '400'}>{label}</text></motion.g> })}
      </svg>
      <svg className="mx-auto block h-[760px] w-full max-w-[340px] md:hidden" viewBox="0 0 320 750" role="img" aria-label="Revora revenue growth pipeline">
        <motion.path d={`M ${mobilePoints.map((point) => `${point.x},${point.y}`).join(' L ')}`} fill="none" stroke="rgba(16,185,129,0.25)" strokeWidth="2" strokeDasharray="5 7" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1, delay: 0.35 }} />
        {pipelineStages.map(({ label, icon: Icon }, index) => { const point = mobilePoints[index]; return <motion.g key={label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }}><circle cx={point.x} cy={point.y} r="27" fill={index === pipelineStages.length - 1 ? '#0d2d24' : '#151719'} stroke={index === pipelineStages.length - 1 ? '#10b981' : 'rgba(255,255,255,0.14)'} strokeWidth="1.5" /><foreignObject x={point.x - 12} y={point.y - 12} width="24" height="24"><div className="grid h-6 w-6 place-items-center text-emerald"><Icon size={17} /></div></foreignObject><text x={point.x} y={point.y + 48} textAnchor="middle" fill={index === pipelineStages.length - 1 ? '#10b981' : '#a4aab3'} fontSize="11" fontWeight={index === pipelineStages.length - 1 ? '600' : '400'}>{label}</text></motion.g> })}
      </svg>
    </div>
  )
}

function OverviewPage() {
  const navigate = useNavigate()
  const features = [
    { title: 'Deterministic guardrails', body: 'Every growth proposal clears auditable audience, exposure, and experiment checks.', icon: Scale },
    { title: 'LLM reasons, code calculates', body: 'AI explains the opportunity while Revora keeps the numbers reproducible.', icon: BrainCircuit },
    { title: 'Razorpay Test Mode payments', body: 'Validate payment and webhook paths without risking production transactions.', icon: CircleDollarSign },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="max-w-6xl">
      <section className="max-w-4xl pt-4 sm:pt-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald"><span className="grid size-7 place-items-center rounded-lg bg-emerald text-[#06150f]"><Sparkles size={14} /></span>Revenue intelligence, in motion</motion.div>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.055em] text-white sm:text-6xl">Revora<span className="text-emerald">.</span></motion.h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }} className="mt-5 max-w-2xl text-xl leading-8 text-slate-300 sm:text-2xl">Autonomous Revenue Growth Agent for Merchants</motion.p>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Revora discovers high-signal cross-sell opportunities, turns them into controlled experiments, and closes the loop with an evidence-backed SCALE or STOP decision.</motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.27 }} className="mt-8"><Button className="h-11 px-5" onClick={() => navigate('/opportunity')}>Run Discovery <Lightbulb size={16} /></Button></motion.div>
      </section>
      <ArchitectureDiagram />
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {features.map(({ title, body, icon: Icon }, index) => <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.75 + index * 0.1 }}><Card className="h-full bg-[#0d0e0f]"><CardContent className="p-5"><div className="mb-7 grid size-9 place-items-center rounded-lg border border-emerald/20 bg-emerald/10 text-emerald"><Icon size={17} /></div><h2 className="text-sm font-medium text-white">{title}</h2><p className="mt-2 text-xs leading-6 text-muted">{body}</p></CardContent></Card></motion.div>)}
      </section>
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
  return <div className="min-h-screen bg-canvas text-slate-100"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="min-h-screen lg:pl-[248px]"><header className="flex h-[72px] items-center justify-between border-b border-line px-5 sm:px-8 lg:px-12"><div className="flex items-center gap-3"><Button variant="ghost" className="size-9 p-0 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></Button><span className="text-sm text-muted">{current.label}</span></div><div className="flex items-center gap-3"><span className="hidden text-xs text-[#626873] sm:inline">Last synced just now</span><div className="size-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div></header><div className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12"><Routes><Route path="/" element={<OverviewPage />} /><Route path="/opportunity" element={<PlaceholderPage eyebrow="Opportunity" title="Find the next high-signal move." description="Turn customer purchase patterns into focused, evidence-backed opportunities for your merchant team." icon={Lightbulb} />} /><Route path="/experiment" element={<PlaceholderPage eyebrow="Experiment" title="Test with confidence." description="Design controlled growth experiments with clear guardrails, clean cohorts, and a repeatable operating rhythm." icon={FlaskConical} />} /><Route path="/results" element={<PlaceholderPage eyebrow="Results" title="Measure what moved." description="Read the impact of every experiment with transparent outcomes and decisions grounded in real customer behavior." icon={BarChart3} />} /></Routes></div></main></div>
}

export default App
