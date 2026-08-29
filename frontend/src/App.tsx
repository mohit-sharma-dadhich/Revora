import { motion } from 'framer-motion'
import { BarChart3, BrainCircuit, ChevronLeft, CircleDollarSign, ClipboardList, FlaskConical, Gauge, GitBranch, Lightbulb, Menu, Network, Scale, Settings2, Sparkles, Upload, X } from 'lucide-react'
import { Component, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Separator } from './components/ui/separator'
import { cn } from './lib/utils'
import { createTestSession, signIn, signUp } from './lib/api'
import type { AuthSession } from './lib/types'
import { AuditPage } from './pages/AuditPage'
import { ExperimentPage } from './pages/ExperimentPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OpportunityPage } from './pages/OpportunityPage'
import { ResultsPage } from './pages/ResultsPage'
import { ProfilePage } from './pages/ProfilePage'

const navigation = [
  { label: 'Overview', to: '/', icon: Gauge },
  { label: 'Onboarding', to: '/onboarding', icon: Upload },
  { label: 'Opportunity', to: '/opportunity', icon: Lightbulb },
  { label: 'Experiment', to: '/experiment', icon: FlaskConical },
  { label: 'Results', to: '/results', icon: BarChart3 },
  { label: 'Audit Trail', to: '/audit', icon: ClipboardList },
]

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return <Card className="border-amber-500/25 bg-amber-500/[0.05]"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-300">Workspace interrupted</p><h1 className="mt-4 text-2xl font-semibold text-white">Something went wrong</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">Refresh the workspace to continue. Your saved experiment data is unchanged.</p><Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Refresh workspace</Button></CardContent></Card>
  }
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
      <svg className="revora-mobile-pipeline mx-auto block h-[820px] w-full max-w-[340px] md:hidden" viewBox="0 0 320 820" role="img" aria-label="Revora revenue growth pipeline">
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

function Sidebar({ open, onClose, onProfile }: { open: boolean; onClose: () => void; onProfile: () => void }) {
  const session = JSON.parse(localStorage.getItem('revora_session') || 'null') as AuthSession | null
  const displayName = session?.user?.name || 'Test workspace'
  const displayEmail = session?.user?.email || 'Expires in 2 hours'
  return <>
    {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-[#0d0e0f] px-4 py-5 transition-transform duration-300 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center justify-between px-3"><NavLink to="/" onClick={onClose} className="flex items-center gap-2.5 text-white"><span className="grid size-8 place-items-center rounded-lg bg-emerald text-[#06150f]"><Sparkles size={17} strokeWidth={2.5} /></span><span className="text-lg font-semibold tracking-[-0.04em]">revora</span></NavLink><Button variant="ghost" className="size-8 p-0 lg:hidden" onClick={onClose} aria-label="Close navigation"><X size={17} /></Button></div>
      <div className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#626873]">Workspace</div>
      <nav className="mt-3 space-y-1">{navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-emerald/10 text-emerald' : 'text-muted hover:bg-white/[0.04] hover:text-slate-200')}>{({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} /><span>{label}</span>{isActive && <ChevronLeft className="ml-auto rotate-180" size={14} />}</>}</NavLink>)}</nav>
      <div className="mt-auto"><Separator className="mb-4" /><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-slate-200"><Settings2 size={17} /><span>Settings</span></button><button type="button" onClick={onProfile} className="mt-5 flex w-full items-center gap-3 rounded-lg border border-line bg-white/[0.025] p-3 text-left transition-colors hover:bg-white/[0.06]"><div className="grid size-8 place-items-center rounded-full bg-[#24332e] text-xs font-semibold text-emerald">{displayName.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{displayName}</p><p className="mt-0.5 truncate text-[11px] text-muted">{displayEmail}</p></div></button></div>
    </aside>
  </>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<'test' | 'live'>('test')
  const [signupMode, setSignupMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function hasValidDomain(value: string) {
    const domain = value.trim().toLowerCase().split('@')[1] || ''
    return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'live' && signupMode && !hasValidDomain(email)) {
      setError('Please use an email address with a genuine domain, such as gmail.com or yahoo.com.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const session = mode === 'test' ? await createTestSession() : signupMode ? await signUp(name, email, password) : await signIn(email, password)
      localStorage.setItem('revora_session_token', session.token)
      localStorage.setItem('revora_session', JSON.stringify(session))
      onAuthenticated(session)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to start session.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="grid min-h-screen place-items-center bg-canvas px-5 text-slate-100"><Card className="w-full max-w-md border-line bg-[#0d0e0f]"><CardContent className="p-7 sm:p-9"><div className="flex items-center gap-3 text-white"><span className="grid size-9 place-items-center rounded-lg bg-emerald text-[#06150f]"><Sparkles size={18} /></span><span className="text-xl font-semibold">revora</span></div><p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-emerald">Workspace access</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Start growing revenue</h1><div className="mt-7 grid grid-cols-2 gap-2 rounded-lg bg-white/[0.04] p-1"><button type="button" onClick={() => setMode('test')} className={cn('rounded-md px-3 py-2 text-sm', mode === 'test' ? 'bg-emerald text-[#06150f]' : 'text-muted')}>Test mode</button><button type="button" onClick={() => setMode('live')} className={cn('rounded-md px-3 py-2 text-sm', mode === 'live' ? 'bg-emerald text-[#06150f]' : 'text-muted')}>Sign in</button></div>{mode === 'test' ? <><p className="mt-5 text-sm leading-6 text-muted">Explore with temporary data. This workspace and its experiments expire automatically after two hours.</p><Button className="mt-7 w-full" onClick={() => submit({ preventDefault() {} } as FormEvent)} disabled={busy}>Continue as guest</Button></> : <form className="mt-6 space-y-4" onSubmit={submit}>{signupMode && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="h-11 w-full rounded-lg border border-line bg-white/[0.03] px-3 text-sm text-white outline-none" required /> }<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-11 w-full rounded-lg border border-line bg-white/[0.03] px-3 text-sm text-white outline-none" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (8+ characters)" className="h-11 w-full rounded-lg border border-line bg-white/[0.03] px-3 text-sm text-white outline-none" minLength={8} required /><Button className="w-full" disabled={busy}>{signupMode ? 'Create account' : 'Sign in'}</Button><button type="button" onClick={() => setSignupMode((current) => !current)} className="w-full text-sm text-emerald">{signupMode ? 'Already have an account? Sign in' : 'Create a new account'}</button></form>}{error && <p className="mt-4 text-sm text-rose-300">{error}</p>}</CardContent></Card></div>
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(() => JSON.parse(localStorage.getItem('revora_session') || 'null'))
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (session?.mode === 'test' && new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem('revora_session_token')
      localStorage.removeItem('revora_session')
      setSession(null)
    }
  }, [session])
  if (!session) return <AuthScreen onAuthenticated={setSession} />
  const handleLogout = () => {
    localStorage.removeItem('revora_session_token')
    localStorage.removeItem('revora_session')
    setSession(null)
  }
  const current = navigation.find((item) => item.to === location.pathname) ?? navigation[0]
  return <div className="min-h-screen bg-canvas text-slate-100"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onProfile={() => { setSidebarOpen(false); navigate('/profile') }} /><main className="min-h-screen lg:pl-[248px]"><header className="flex h-[72px] items-center justify-between border-b border-line px-5 sm:px-8 lg:px-12"><div className="flex items-center gap-3"><Button variant="ghost" className="size-9 p-0 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></Button><span className="text-sm text-muted">{current.label}</span></div><div className="flex items-center gap-3"><span className="hidden text-xs text-[#626873] sm:inline">Last synced just now</span><div className="size-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div></header><div className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12"><AppErrorBoundary><Routes><Route path="/" element={<OverviewPage />} /><Route path="/onboarding" element={<OnboardingPage />} /><Route path="/opportunity" element={<OpportunityPage />} /><Route path="/experiment" element={<ExperimentPage />} /><Route path="/experiment/:id" element={<ExperimentPage />} /><Route path="/experiments/:experimentId" element={<ExperimentPage />} /><Route path="/results" element={<ResultsPage />} /><Route path="/results/:experimentId" element={<ResultsPage />} /><Route path="/audit" element={<AuditPage />} /><Route path="/profile" element={<ProfilePage session={session} onLogout={handleLogout} />} /></Routes></AppErrorBoundary></div></main></div>
}

export default App
