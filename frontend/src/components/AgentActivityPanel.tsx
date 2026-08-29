import { CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import type { AgentRun, AgentStep } from '../lib/types'

interface AgentActivityPanelProps {
  run: AgentRun | null | undefined
  isLoading?: boolean
}

const stepTitles: Record<string, string> = {
  analytics_selection: 'Analytics tools selected',
  data_inspection: 'Historical evidence inspected',
  opportunity_identification: 'Opportunity identified',
  ai_reasoning: 'AI reasons',
  recommendation_generation: 'Recommendation generated',
  guardrail_check: 'Guardrails evaluated',
}

const stepDescriptions: Record<string, string> = {
  analytics_selection: 'Preparing to analyze merchant data and customer history.',
  data_inspection: 'Examining historical customer behavior and product relationships.',
  opportunity_identification: 'Identifying cross-sell opportunities with affinity scoring.',
  ai_reasoning: 'AI interprets evidence and formulates recommendation.',
  recommendation_generation: 'Final recommendation prepared.',
  guardrail_check: 'Validating against safety and business constraints.',
}

function getStatusIcon(status: AgentStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={18} className="text-emerald" />
    case 'running':
      return <Loader2 size={18} className="text-blue-400 animate-spin" />
    case 'failed':
      return <AlertCircle size={18} className="text-red-400" />
    case 'pending':
      return <Clock size={18} className="text-muted" />
    default:
      return null
  }
}

function getStatusBadgeClass(status: AgentStep['status'] | AgentRun['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald/30 bg-emerald/10 text-emerald'
    case 'running':
      return 'border-blue-400/30 bg-blue-400/10 text-blue-400'
    case 'failed':
      return 'border-red-400/30 bg-red-400/10 text-red-400'
    case 'pending':
      return 'border-muted/30 bg-muted/10 text-muted'
    default:
      return 'border-emerald/20 bg-emerald/10 text-emerald'
  }
}

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return ''
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  const durationMs = endTime - startTime
  
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }
  
  const seconds = Math.floor(durationMs / 1000)
  return `${seconds}s`
}

function StepRow({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const title = stepTitles[step.stepType] || step.stepType
  const description = stepDescriptions[step.stepType] || step.summary || ''
  const duration = formatDuration(step.startedAt, step.completedAt)
  const hasDetails = step.outputSummary && Object.keys(step.outputSummary).length > 0

  return (
    <div key={index} className="border-b border-line last:border-b-0">
      <div className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors">
        <div className="mt-1 flex-shrink-0">{getStatusIcon(step.status)}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-white truncate">{title}</p>
            {duration && <span className="text-xs text-muted whitespace-nowrap">{duration}</span>}
          </div>
          <p className="mt-1 text-xs text-muted line-clamp-2">{description}</p>
          
          {hasDetails && (
            <div className="mt-3">
              <Button
                variant="ghost"
                className="h-auto p-0 text-xs text-blue-400 hover:text-blue-300"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronDown size={14} className={`mr-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                Evidence
              </Button>
              
              {expanded && (
                <div className="mt-2 space-y-1 rounded bg-white/[0.02] p-2 text-xs">
                  {Object.entries(step.outputSummary || {}).map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-2">
                      <span className="text-muted capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-emerald font-medium">
                        {typeof value === 'number' ? (key.includes('percent') || key.includes('affinity') ? `${(value * 100).toFixed(1)}%` : String(value)) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(step.status)}`}>
            {step.status}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentActivityPanel({ run, isLoading }: AgentActivityPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-emerald mr-3" />
          <span className="text-muted">Loading agent activity...</span>
        </CardContent>
      </Card>
    )
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted text-sm">No agent activity yet</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Agent Activity</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{run.goal}</h3>
          </div>
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(run.status)}`}>
            {run.status}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {run.steps.length > 0 ? (
          <div className="border border-line rounded-lg overflow-hidden">
            {run.steps.map((step, index) => (
              <StepRow key={index} step={step} index={index} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted">
            <span className="text-sm">No steps recorded yet</span>
          </div>
        )}
        
        {run.finalRecommendation && (
          <div className="mt-4 p-4 rounded-lg border border-emerald/20 bg-emerald/[0.05]">
            <p className="text-xs text-emerald uppercase tracking-wide font-medium">Recommendation</p>
            <p className="mt-2 text-sm leading-relaxed text-white">{run.finalRecommendation}</p>
            <p className="mt-2 text-xs text-muted italic">AI-generated recommendation</p>
          </div>
        )}
        
        {run.error && (
          <div className="mt-4 p-4 rounded-lg border border-red-500/20 bg-red-500/[0.05]">
            <p className="text-xs text-red-400 uppercase tracking-wide font-medium">Error</p>
            <p className="mt-2 text-sm text-red-300">{run.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
