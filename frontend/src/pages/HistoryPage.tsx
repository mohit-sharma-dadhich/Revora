import { ChevronDown, ClipboardList, FileCheck2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { useExperimentHistory } from '../lib/apiHooks'
import { formatMoney } from '../lib/format'
import type { Experiment, ExperimentMeasurement } from '../lib/types'

function formatDate(value: string | null) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function verdictTone(decision: string) {
  if (decision === 'SCALE') return 'border-emerald/25 bg-emerald/10 text-emerald'
  if (decision === 'STOP') return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  return 'border-sky-500/25 bg-sky-500/10 text-sky-300'
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-[0.1em] text-[#626873]">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{value}</p></div>
}

function MeasurementDetails({ measurement }: { measurement: ExperimentMeasurement }) {
  return <div className="grid gap-5 border-t border-line px-5 py-5 md:grid-cols-3"><div className="space-y-4"><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted">Control</p><Metric label="Conversion rate" value={`${(measurement.control.conversionRate * 100).toFixed(1)}%`} /><Metric label="Conversions" value={String(measurement.control.convertedCustomerCount)} /><Metric label="Revenue" value={formatMoney(measurement.control.totalRevenue)} /></div><div className="space-y-4"><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted">Treatment</p><Metric label="Conversion rate" value={`${(measurement.treatment.conversionRate * 100).toFixed(1)}%`} /><Metric label="Conversions" value={String(measurement.treatment.convertedCustomerCount)} /><Metric label="Revenue" value={formatMoney(measurement.treatment.totalRevenue)} /></div><div className="space-y-4"><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted">Final impact</p><Metric label="Incremental revenue / customer" value={formatMoney(measurement.incremental.incrementalRevenuePerEligibleCustomer)} /><Metric label="Revenue uplift" value={measurement.incremental.revenueUpliftPercent === null ? 'Not available' : `${measurement.incremental.revenueUpliftPercent.toFixed(1)}%`} /></div></div>
}

function ExperimentRow({ experiment }: { experiment: Experiment }) {
  const [open, setOpen] = useState(false)
  const measurement = experiment.results.measurement
  const decisionChecks = experiment.results.decisionChecks || []
  return <Card className="overflow-hidden"><button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium text-white">{experiment.baseProductName || 'Base product'} <span className="text-muted">to</span> {experiment.targetProductName || 'Target product'}</span><Badge className="border-emerald/20 bg-emerald/10 text-emerald">completed</Badge><Badge className={verdictTone(experiment.decision)}>{experiment.decision}</Badge></div><p className="mt-2 text-xs text-muted">{experiment.strategy} · Ended {formatDate(experiment.endAt)}</p></div><ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div>{measurement ? <MeasurementDetails measurement={measurement} /> : <div className="border-t border-line px-5 py-5 text-sm text-muted">No measurement was stored for this experiment.</div>}<div className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-3"><Metric label="Started" value={formatDate(experiment.startAt)} /><Metric label="Last analyzed" value={experiment.lastAnalyzedAt ? formatDate(experiment.lastAnalyzedAt) : 'Never analyzed'} /><Metric label="Scale events" value={String(experiment.scaleEvents?.length || 0)} /></div>{decisionChecks.length > 0 && <div className="border-t border-line px-5 py-5"><p className="mb-3 text-xs font-medium uppercase tracking-[0.13em] text-muted">Decision checks</p><div className="space-y-2">{decisionChecks.map((check) => <div key={check.name} className="flex items-start gap-2 text-xs"><span className={check.passed ? 'mt-1 size-1.5 shrink-0 rounded-full bg-emerald' : 'mt-1 size-1.5 shrink-0 rounded-full bg-red-300'} /><span className="text-muted">{check.reason}</span></div>)}</div></div>}</div>}</Card>
}

export function HistoryPage() {
  const query = useExperimentHistory()
  if (query.isLoading) return <Card><CardContent className="flex min-h-72 items-center justify-center text-sm text-muted">Loading experiment history...</CardContent></Card>
  if (query.isError) return <Card className="border-red-500/20"><CardContent className="p-6"><p className="text-sm text-red-300">Unable to load experiment history</p><p className="mt-2 text-sm text-muted">{query.error.message}</p></CardContent></Card>
  const experiments = query.data?.experiments || []
  if (experiments.length === 0) return <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><ClipboardList className="text-muted" size={24} /><h1 className="mt-5 text-2xl font-semibold text-white">No completed experiments</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">Completed experiments will appear here with their final verdict and stored measurement data.</p></CardContent></Card>
  return <div className="max-w-5xl space-y-6"><div><div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald"><FileCheck2 size={15} />History</div><h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Completed experiments.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Review final verdicts and measured outcomes from experiments that have ended.</p></div><div className="space-y-3">{experiments.map((experiment) => <ExperimentRow key={experiment.id} experiment={experiment} />)}</div></div>
}
