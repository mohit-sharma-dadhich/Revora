import { motion } from 'framer-motion'
import { ArrowLeft, Check, CircleDollarSign, FlaskConical, Play, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { useAnalyzeExperiment, useCreatePaymentOrder, useExperiment, useStartExperiment, useVerifyPayment } from '../lib/apiHooks'
import type { Experiment, ExperimentProposal, ExperimentSummary, Guardrails } from '../lib/types'

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>
  theme: { color: string }
}

type RazorpaySuccessResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayFailureResponse = { error?: { code?: string; description?: string } }
type RazorpayInstance = { open: () => void; on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void }
type ExperimentRouteState = { experimentId?: string; guardrails?: Guardrails; proposal?: ExperimentProposal | null; experiment?: ExperimentSummary | null }
type CustomerGroup = 'control' | 'treatment'

function getStoredGuardrails(experiment: Experiment | ExperimentSummary | null | undefined): Guardrails | undefined {
  if (!experiment || !('results' in experiment) || !experiment.results.guardrails) return undefined
  return experiment.results.guardrails
}

function titleCase(value: string) { return value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay Checkout.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'))
    document.body.appendChild(script)
  })
}

export function ExperimentPage() {
  const navigate = useNavigate()
  const { id, experimentId: parameterExperimentId } = useParams<{ id?: string; experimentId?: string }>()
  const { state } = useLocation()
  const routeState = (state || {}) as ExperimentRouteState
  const storedExperimentId = typeof window === 'undefined' ? undefined : sessionStorage.getItem('revora.experimentId') || undefined
  const experimentId = parameterExperimentId || id || routeState.experimentId || storedExperimentId
  const experimentQuery = useExperiment(experimentId)
  const start = useStartExperiment()
  const analyze = useAnalyzeExperiment()
  const createOrder = useCreatePaymentOrder()
  const verify = useVerifyPayment()
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [paidCustomers, setPaidCustomers] = useState<Record<string, boolean>>({})
  const [failedCustomers, setFailedCustomers] = useState<Record<string, boolean>>({})
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null)
  const experiment = experimentQuery.data || routeState.experiment

  useEffect(() => {
    if (!experimentId) {
      setPaidCustomers({})
      setFailedCustomers({})
      return
    }

    try {
      const stored = sessionStorage.getItem(`revora.experiment.payments.${experimentId}`)
      if (!stored) {
        setPaidCustomers({})
        setFailedCustomers({})
        return
      }

      const parsed = JSON.parse(stored) as { paid?: Record<string, boolean>; failed?: Record<string, boolean> }
      setPaidCustomers(parsed.paid || {})
      setFailedCustomers(parsed.failed || {})
    } catch {
      setPaidCustomers({})
      setFailedCustomers({})
    }
  }, [experimentId])

  useEffect(() => {
    if (!experimentId) return
    sessionStorage.setItem(`revora.experiment.payments.${experimentId}`, JSON.stringify({
      paid: paidCustomers,
      failed: failedCustomers,
    }))
  }, [experimentId, paidCustomers, failedCustomers])
  const guardrails = routeState.guardrails || getStoredGuardrails(experiment)
  const proposal = routeState.proposal

  useEffect(() => {
    if (experimentId) {
      sessionStorage.setItem('revora.experimentId', experimentId)
    }
  }, [experimentId])

  useEffect(() => {
    if (experimentQuery.isError && (experimentQuery.error as { status?: number }).status === 404) {
      sessionStorage.removeItem('revora.experimentId')
    }
  }, [experimentQuery.isError, experimentQuery.error])

  if (!experimentId) return <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.04] text-muted"><FlaskConical size={21} /></div><h1 className="mt-5 text-2xl font-semibold text-white">No active experiment</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">Start from onboarding to prepare the data and launch a new experiment.</p><Button variant="outline" className="mt-6" onClick={() => navigate('/onboarding')}><ArrowLeft size={16} />Back to Onboarding</Button></CardContent></Card>

  if (experimentQuery.isLoading && !experiment) return <Card><CardContent className="flex min-h-72 items-center justify-center p-6 text-sm text-muted">Loading experiment...</CardContent></Card>
  if (experimentQuery.isError && !experiment) {
    const notFound = (experimentQuery.error as { status?: number }).status === 404
    return <Card className="border-red-500/20"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><h1 className="text-2xl font-semibold text-white">{notFound ? 'Experiment is not available in this session' : 'Experiment could not be loaded.'}</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">{notFound ? 'This experiment belongs to a different session or was reset. Start a new onboarding flow to continue.' : experimentQuery.error.message}</p><Button variant="outline" className="mt-6" onClick={() => navigate('/onboarding')}><ArrowLeft size={16} />Back to Onboarding</Button></CardContent></Card>
  }

  const blocked = guardrails && !guardrails.passed
  const status = start.data?.status || experiment?.status || 'pending'
  const audience = start.data || experimentQuery.data || null
  const controlCustomers = audience?.controlCustomerIds || proposal?.controlCustomerIds || []
  const treatmentCustomers = audience?.treatmentCustomerIds || proposal?.treatmentCustomerIds || []
  const controlSize = controlCustomers.length
  const treatmentSize = treatmentCustomers.length
  const total = controlSize + treatmentSize || 1
  const startExperiment = () => start.mutate(experimentId)
  const analyzeExperiment = () => {
    setAnalysisError(null)
    analyze.mutate(experimentId, {
      onSuccess: (result) => navigate(`/results/${experimentId}`, { state: { experiment: result.experiment, experimentId } }),
      onError: (error) => {
        if (error.status === 429) setAnalysisError(`Not enough new data: ${error.message}`)
      },
    })
  }
  const simulatePayment = async (customerId: string, group: CustomerGroup) => {
    const paymentKey = `${group}:${customerId}`
    setActiveCustomer(paymentKey)
    try {
      const order = await createOrder.mutateAsync({ experimentId, customerId })
      await loadRazorpayScript()
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.')
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Revora',
        description: `${group} experiment payment`,
        order_id: order.orderId,
        theme: { color: '#10b981' },
        handler: async (response) => {
          try {
            await verify.mutateAsync(response)
            setPaidCustomers((current) => ({ ...current, [paymentKey]: true }))
            toast.success(`${group === 'control' ? 'Control' : 'Treatment'} payment verified`)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Payment verification failed')
          } finally {
            setActiveCustomer(null)
          }
        },
      })
      checkout.on('payment.failed', (response) => {
        setFailedCustomers((current) => ({ ...current, [paymentKey]: true }))
        setActiveCustomer(null)
        toast.error(response.error?.description || 'Payment failed')
      })
      checkout.open()
    } catch (error) {
      setActiveCustomer(null)
      toast.error(error instanceof Error ? error.message : 'Unable to create payment order')
    }
  }
  return <><Toaster theme="dark" position="bottom-right" /><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-5xl space-y-6"><div><div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald"><FlaskConical size={15} />Experiment design</div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Verify the experiment.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">A guarded proposal for the opportunity you just discovered.</p></div><div className="flex flex-wrap items-center gap-3"><StatusBadge status={status} />{status === 'running' && <Button onClick={analyzeExperiment} disabled={analyze.isPending}>{analyze.isPending ? 'Analyzing...' : 'Analyze'}</Button>}</div></div>{analysisError && <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">{analysisError}</div>}</div>
    {guardrails && <Card><CardHeader><div className="flex items-center gap-3"><ShieldCheck size={17} className="text-emerald" /><div><p className="text-sm font-medium text-white">Guardrail verification</p><p className="mt-1 text-xs text-muted">Every check must pass before exposure begins.</p></div></div></CardHeader><CardContent className="space-y-3">{guardrails.checks.map((check, index) => <motion.div key={check.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: index * 0.1 }} className="flex items-start gap-3 rounded-lg border border-line bg-white/[0.018] p-4"><div className={check.passed ? 'mt-0.5 text-emerald' : 'mt-0.5 text-red-300'}>{check.passed ? <Check size={16} /> : <X size={16} />}</div><div><p className="text-sm font-medium text-slate-200">{titleCase(check.name)}</p><p className="mt-1 text-xs leading-5 text-muted">{check.reason}</p></div><span className={check.passed ? 'ml-auto text-[10px] uppercase tracking-[0.12em] text-emerald' : 'ml-auto text-[10px] uppercase tracking-[0.12em] text-red-300'}>{check.passed ? 'Passed' : 'Blocked'}</span></motion.div>)}</CardContent></Card>}
    {blocked ? <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-sm text-amber-200"><p className="font-medium">Experiment blocked by guardrails</p><p className="mt-2 leading-6 text-amber-100/70">{guardrails?.checks.find((check) => !check.passed)?.reason || 'One or more guardrail checks failed.'}</p></div> : <><Card><CardHeader><p className="text-sm font-medium text-white">Audience split</p><p className="mt-1 text-xs text-muted">The proposed audience is evenly divided for a clean comparison.</p></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><AudienceStat label="Control" value={controlSize} tone="slate" /><AudienceStat label="Treatment" value={treatmentSize} tone="emerald" /></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-white/[0.07]"><motion.div initial={{ width: 0 }} animate={{ width: `${(controlSize / total) * 100}%` }} transition={{ duration: 0.6 }} className="inline-block h-full bg-slate-500" /><motion.div initial={{ width: 0 }} animate={{ width: `${(treatmentSize / total) * 100}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="inline-block h-full bg-emerald" /></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted">Strategy: <span className="text-slate-200">{experiment?.strategy || proposal?.strategy || 'CROSS_SELL'}</span></p><Button onClick={startExperiment} disabled={start.isPending || status === 'running' || status === 'completed'}>{start.isPending ? 'Starting...' : status === 'running' ? 'Experiment running' : status === 'completed' ? 'Experiment completed' : 'Start Experiment'}<Play size={15} /></Button></div>{start.isError && <p className="mt-4 text-sm text-red-300">{start.error.message}</p>}</CardContent></Card>
      {status === 'running' && <PaymentPanel controlCustomers={controlCustomers} treatmentCustomers={treatmentCustomers} paidCustomers={paidCustomers} failedCustomers={failedCustomers} activeCustomer={activeCustomer} onPay={simulatePayment} />}
    </>}</motion.div></>
}

function PaymentPanel({ controlCustomers, treatmentCustomers, paidCustomers, failedCustomers, activeCustomer, onPay }: { controlCustomers: string[]; treatmentCustomers: string[]; paidCustomers: Record<string, boolean>; failedCustomers: Record<string, boolean>; activeCustomer: string | null; onPay: (customerId: string, group: CustomerGroup) => void }) { return <Card><CardHeader><div className="flex items-center gap-3"><CircleDollarSign size={17} className="text-emerald" /><div><p className="text-sm font-medium text-white">Test Mode payments</p><p className="mt-1 text-xs text-muted">All assigned customers are available below. Scroll within either group to simulate a payment.</p></div></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{(['control', 'treatment'] as const).map((group) => { const customers = group === 'control' ? controlCustomers : treatmentCustomers; return <div key={group} className="min-w-0"><p className="mb-3 text-xs font-medium uppercase tracking-[0.13em] text-muted">{group} <span className="text-slate-200">({customers.length})</span></p><div className="revora-customer-scroll max-h-96 space-y-3 overflow-y-auto pr-1">{customers.map((customerId, index) => { const key = `${group}:${customerId}`; const paid = paidCustomers[key]; const failed = failedCustomers[key]; const busy = activeCustomer === key; return <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.02] p-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-200">{group === 'control' ? 'Control' : 'Treatment'} Customer {index + 1}</p><p className="mt-1 truncate font-mono text-[10px] text-muted">{customerId}</p></div><div className="flex shrink-0 items-center gap-2"><span className={paid ? 'rounded-full bg-emerald/10 px-2 py-1 text-[10px] text-emerald' : failed ? 'rounded-full bg-red-500/10 px-2 py-1 text-[10px] text-red-300' : 'rounded-full border border-line px-2 py-1 text-[10px] text-muted'}>{paid ? 'Paid' : failed ? 'Failed' : group}</span><Button variant={paid ? 'ghost' : 'outline'} className="h-8 px-2.5 text-xs" disabled={paid || busy} onClick={() => onPay(customerId, group)}>{busy ? 'Opening...' : paid ? 'Verified' : 'Simulate Payment'}</Button></div></div> })}</div></div>})}</CardContent></Card> }

function StatusBadge({ status }: { status: string }) { const tone = status === 'running' || status === 'completed' ? 'border-emerald/20 bg-emerald/10 text-emerald' : status === 'pending' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-line bg-white/[0.04] text-muted'; return <Badge className={tone}>{status}</Badge> }

function AudienceStat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'emerald' }) { return <div className="rounded-lg border border-line bg-white/[0.025] p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-[0.13em] text-muted">{label}</p><span className={tone === 'emerald' ? 'size-2 rounded-full bg-emerald' : 'size-2 rounded-full bg-slate-500'} /></div><p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p><p className="mt-1 text-xs text-muted">customers</p></div> }
