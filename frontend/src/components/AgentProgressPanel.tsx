import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getLatestAgentRun } from '../lib/api'
import type { AgentRun, AgentStep } from '../lib/types'
import { Card, CardContent, CardHeader } from './ui/card'

interface AgentProgressPanelProps {
  runType: string
  isActive: boolean
}

function getStepIcon(status: AgentStep['status']) {
  switch (status) {
    case 'running':
      return <Loader2 size={15} className="animate-spin text-blue-400" />
    case 'completed':
      return <Check size={15} className="text-emerald" />
    case 'failed':
      return <X size={15} className="text-red-400" />
    default:
      return <AlertCircle size={15} className="text-muted" />
  }
}

export function AgentProgressPanel({ runType, isActive }: AgentProgressPanelProps) {
  const { data, error } = useQuery<AgentRun | null>({
    queryKey: ['latestAgentRun', runType],
    queryFn: () => getLatestAgentRun(runType),
    enabled: isActive,
    refetchInterval: 1000,
    retry: false,
  })

  if (!isActive || !data || !data.steps?.length) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }

    if (!isActive) {
      return null
    }

    if (!data && !error) {
      return null
    }
  }

  const run = data
  if (!run || !run.steps?.length) return null

  return (
    <Card className="border-emerald/20 bg-[#0b1220]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Agent progress</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{run.goal}</h3>
          </div>
          <div className="rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald">
            {run.status}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {run.steps.map((step, index) => (
          <div key={`${step.stepType}-${index}`} className="flex items-start gap-3 rounded-md border border-line bg-white/[0.02] p-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center">{getStepIcon(step.status)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{step.toolName || step.stepType}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{step.summary || 'Processing...'}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
