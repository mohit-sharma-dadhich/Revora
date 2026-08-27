import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, CheckCircle2, Lightbulb, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { useOpportunity, useProposeExperiment } from '../lib/apiHooks'

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function OpportunitySkeleton() {
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]"><Card><CardContent className="space-y-7 p-6"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-4/5" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div><Skeleton className="h-3 w-full" /></CardContent></Card><Card><CardContent className="space-y-5 p-6"><Skeleton className="h-4 w-28" /><Skeleton className="h-16 w-32" /><Skeleton className="h-3 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card></div><Card><CardContent className="space-y-4 p-6"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card></div>
}

function EmptyOpportunity() {
  return <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.04] text-muted"><Target size={21} /></div><h1 className="mt-5 text-2xl font-semibold text-white">No opportunity found</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">There is no qualified cross-sell opportunity in the current evidence set.</p></CardContent></Card>
}

export function OpportunityPage() {
  const navigate = useNavigate()
  const query = useOpportunity()
  const propose = useProposeExperiment()
  const [proposalError, setProposalError] = useState<string | null>(null)
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null)
  const data = query.data
  const opportunity = data?.opportunity
  const recommendation = data?.recommendation

  if (query.isLoading) return <OpportunitySkeleton />
  if (query.isError) return <Card className="border-red-500/20"><CardContent className="p-6"><p className="text-sm text-red-300">Unable to load opportunity</p><p className="mt-2 text-sm text-muted">{query.error.message}</p></CardContent></Card>
  if (!opportunity) return <EmptyOpportunity />

  const proposeExperiment = () => {
    setProposalError(null)
    setActiveExperimentId(null)
    propose.mutate(undefined, {
      onSuccess: (result) => {
        if (result.experiment && result.guardrails.passed) {
          navigate(`/experiment/${result.experiment.id}`, { state: { guardrails: result.guardrails, proposal: result.proposal, experiment: result.experiment } })
          return
        }

        if (result.experiment) setActiveExperimentId(result.experiment.id)
        setProposalError(result.guardrails.checks.find((check) => !check.passed)?.reason || 'Experiment could not be proposed.')
      },
    })
  }

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-6xl space-y-5">
    <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald"><Lightbulb size={15} />Discovery</div><h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">A high-signal cross-sell opportunity.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Deterministic evidence identifies where a related product is already resonating with your customers.</p></div><Button onClick={proposeExperiment} disabled={propose.isPending} className="shrink-0">{propose.isPending ? 'Proposing...' : 'Propose Experiment'}{!propose.isPending && <ArrowRight size={16} />}</Button></div>
    {(propose.isError || proposalError) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><span className="revora-message">{propose.isError ? propose.error.message : proposalError}</span>{activeExperimentId && <Button variant="outline" className="h-8 shrink-0 px-3 text-xs" onClick={() => navigate(`/experiment/${activeExperimentId}`)}>View Active Experiment <ArrowRight size={14} /></Button>}</div>}
    <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <Card><CardHeader><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Opportunity evidence</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><div><p className="text-[11px] uppercase tracking-[0.12em] text-[#626873]">Base product</p><p className="mt-2 break-all text-sm font-medium text-slate-200">{opportunity.baseProductName || opportunity.baseProductId}</p></div><div><p className="text-[11px] uppercase tracking-[0.12em] text-[#626873]">Related product</p><p className="mt-2 break-all text-sm font-medium text-slate-200">{opportunity.relatedProductName || opportunity.relatedProductId}</p></div></div></CardHeader><CardContent><div className="flex items-end justify-between"><div><p className="text-xs text-muted">Affinity</p><p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white">{formatPercent(opportunity.affinity)}</p></div><span className="text-xs text-emerald">{opportunity.coPurchaseCustomerCount} co-purchases</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(opportunity.affinity * 100, 100)}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full bg-emerald" /></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><StatTile label="Base customers" value={opportunity.baseCustomerCount.toLocaleString()} /><StatTile label="Estimated eligible" value={opportunity.estimatedEligibleCustomers.toLocaleString()} /></div></CardContent></Card>
      <Card className="bg-emerald/[0.045]"><CardContent className="flex h-full flex-col justify-between p-6"><div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Opportunity score</p><TrendingUp size={18} className="text-emerald" /></div><div className="py-8"><p className="text-5xl font-semibold tracking-[-0.06em] text-emerald">{opportunity.opportunityScore.toFixed(2)}</p><p className="mt-3 text-sm leading-6 text-muted">A deterministic ranking signal from affinity and audience scale.</p></div><div className="flex items-center gap-2 text-xs text-emerald"><CheckCircle2 size={14} />Evidence verified</div></CardContent></Card>
    </div>
    {data?.aiAvailable && recommendation ? <Card className="border-l-2 border-l-emerald bg-[#101a17]"><CardHeader className="flex flex-row items-center justify-between border-b-emerald/10"><div className="flex items-center gap-2"><BrainCircuit size={16} className="text-emerald" /><p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald">AI Recommendation</p><Badge className="ai-generated-badge">AI-generated</Badge></div><Confidence value={recommendation.confidence} /></CardHeader><CardContent><h2 className="max-w-3xl text-xl font-medium leading-8 text-white">{recommendation.recommendation}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{recommendation.reasoning}</p></CardContent></Card> : <Card className="border-amber-500/20 bg-amber-500/[0.045]"><CardContent className="flex items-start gap-4 p-6"><div className="grid size-9 shrink-0 place-items-center rounded-lg border border-amber-500/20 text-amber-300"><BrainCircuit size={17} /></div><div><p className="text-sm font-medium text-amber-200">AI recommendation unavailable</p><p className="mt-2 text-sm leading-6 text-amber-100/70">{data?.aiError || 'The deterministic opportunity remains available without an AI interpretation.'}</p></div></CardContent></Card>}
  </motion.div>
}

function StatTile({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-line bg-white/[0.025] p-4"><p className="text-[11px] uppercase tracking-[0.12em] text-[#626873]">{label}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></div> }

function Confidence({ value }: { value: number }) { const percent = Math.round(value * 100); return <div className="relative grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${percent * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}><div className="grid size-11 place-items-center rounded-full bg-[#101a17] text-xs font-semibold text-emerald">{percent}%</div></div> }
