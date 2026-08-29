import { motion } from 'framer-motion'
import { ChevronDown, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuditLog } from '../lib/apiHooks'
import type { AuditLogEntry } from '../lib/types'

interface AuditPageParams {
  limit: number
  skip: number
  action: string | null
  status: string | null
}

function AuditSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-white/[0.07]" />
        <div className="h-10 w-56 animate-pulse rounded bg-white/[0.07]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/[0.07]" />
      </CardContent>
    </Card>
  )
}

function EmptyAuditState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.04] text-muted">
          <ClipboardList size={21} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-white">No audit entries</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Audit events will appear here as you interact with Revora.</p>
      </CardContent>
    </Card>
  )
}

function titleCase(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'border-emerald/20 bg-emerald/10 text-emerald'
    case 'FAILED':
    case 'BLOCKED':
      return 'border-red-500/20 bg-red-500/10 text-red-300'
    case 'PENDING':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
    default:
      return 'border-line bg-white/[0.04] text-muted'
  }
}

function AuditEntryRow({ entry, index }: { entry: AuditLogEntry; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="border-b border-line last:border-b-0"
    >
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
              <p className="mt-1 text-sm font-medium text-slate-200">{titleCase(entry.action)}</p>
            </div>
            <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
          </div>
          {entry.reason && <p className="mt-2 text-xs leading-5 text-muted">{entry.reason}</p>}
        </div>
        {Object.keys(entry.metadata).length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted hover:text-slate-200"
            aria-label="Toggle metadata"
          >
            <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {expanded && Object.keys(entry.metadata).length > 0 && (
        <div className="border-t border-line bg-white/[0.015] px-5 py-4">
          <pre className="overflow-auto rounded-lg bg-white/[0.03] p-3 text-[11px] text-slate-300">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </motion.div>
  )
}

export function AuditPage() {
  const [params, setParams] = useState<AuditPageParams>({
    limit: 50,
    skip: 0,
    action: null,
    status: null,
  })

  const query = useAuditLog(params)
  const data = query.data

  if (query.isLoading && !data) return <AuditSkeleton />

  if (query.isError && !data) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="p-6">
          <p className="text-sm text-red-300">Unable to load audit trail</p>
          <p className="mt-2 text-sm text-muted">{query.error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.entries.length === 0) return <EmptyAuditState />

  const canLoadMore = data.skip + data.limit < data.total

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl space-y-5"
    >
      <div>
        <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald">
          <ClipboardList size={15} />
          Audit trail
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">System activity log</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          A complete record of all deterministic actions, payments, and experiment lifecycle events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Audit entries</p>
              <p className="mt-1 text-xs text-muted">
                Showing {data.skip + 1} to {Math.min(data.skip + data.limit, data.total)} of {data.total}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {data.entries.map((entry, index) => (
              <AuditEntryRow key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        </CardContent>
      </Card>

      {canLoadMore && (
        <div className="flex justify-center">
          <Button
            onClick={() =>
              setParams((current) => ({
                ...current,
                skip: current.skip + current.limit,
              }))
            }
            disabled={query.isLoading}
            variant="outline"
          >
            {query.isLoading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </motion.div>
  )
}
