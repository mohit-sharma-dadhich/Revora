import { ArrowLeft, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import type { AuthSession } from '../lib/types'

interface ProfilePageProps {
  session: AuthSession
  onLogout: () => void
}

export function ProfilePage({ session, onLogout }: ProfilePageProps) {
  const navigate = useNavigate()
  const identity = session.user
  const id = identity?.id || session.sessionId

  return (
    <div className="max-w-3xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-white">
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald">Account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Profile</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Your workspace identity and session details.</p>
        </div>
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[#24332e] text-lg font-semibold text-emerald">
          {(identity?.name || 'Test').slice(0, 2).toUpperCase()}
        </div>
      </div>
      <Card className="mt-8 border-line bg-[#0d0e0f]">
        <CardContent className="divide-y divide-line p-0">
          <div className="flex items-center gap-4 p-5"><UserRound className="text-emerald" size={19} /><div><p className="text-xs text-muted">Name</p><p className="mt-1 text-sm text-white">{identity?.name || 'Test workspace'}</p></div></div>
          <div className="flex items-center gap-4 p-5"><Mail className="text-emerald" size={19} /><div><p className="text-xs text-muted">Email</p><p className="mt-1 text-sm text-white">{identity?.email || 'Guest session'}</p></div></div>
          <div className="flex items-center gap-4 p-5"><ShieldCheck className="text-emerald" size={19} /><div className="min-w-0"><p className="text-xs text-muted">{identity ? 'User ID' : 'Session ID'}</p><p className="mt-1 break-all font-mono text-xs text-slate-200">{id}</p></div></div>
        </CardContent>
      </Card>
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-line bg-[#0d0e0f] p-5">
        <div><p className="text-sm font-medium text-white">{session.mode === 'test' ? 'Test mode' : 'Live workspace'}</p><p className="mt-1 text-xs text-muted">{session.mode === 'test' ? 'This session expires automatically after two hours.' : 'Your account data remains available until you remove it.'}</p></div>
        <Button variant="outline" onClick={onLogout}><LogOut size={16} />Log out</Button>
      </div>
    </div>
  )
}
