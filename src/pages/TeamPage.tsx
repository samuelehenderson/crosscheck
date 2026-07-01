// The main team view: projection header, roster board, and the ranks + trades
// sidebar. Clicking a player opens the trade modal.

import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import type { Player } from '../types'
import { useStore } from '../store'
import { TeamHeader } from '../components/TeamHeader'
import { RosterBoard } from '../components/RosterBoard'
import { RanksPanel } from '../components/RanksPanel'
import { TradePanel } from '../components/TradePanel'
import { TradeModal } from '../components/TradeModal'

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const store = useStore()
  const [tradingPlayer, setTradingPlayer] = useState<Player | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [pulse, setPulse] = useState(0)

  // The after-trade version of this team is what we display on the board.
  const team = useMemo(
    () => store.afterTeams.find((t) => t.id === teamId),
    [store.afterTeams, teamId],
  )

  const playerById = useMemo(() => {
    const m = new Map<string, Player>()
    store.baseTeams.forEach((t) => t.roster.forEach((p) => m.set(p.id, p)))
    return m
  }, [store.baseTeams])

  const teamById = useMemo(
    () => Object.fromEntries(store.baseTeams.map((t) => [t.id, t])),
    [store.baseTeams],
  )

  if (!team || !teamId) return <Navigate to="/" replace />

  const before = store.before.get(teamId)!
  const after = store.after.get(teamId)!

  // "Run Simulation" is a deterministic recompute; we animate it so the button
  // feels alive and re-renders the freshest numbers.
  const runSimulation = () => {
    setSimulating(true)
    window.setTimeout(() => {
      setSimulating(false)
      setPulse((p) => p + 1)
    }, 550)
  }

  const confirmTrade = (toTeamId: string) => {
    if (!tradingPlayer) return
    store.addAsset({
      playerId: tradingPlayer.id,
      fromTeamId: store.ownerOf.get(tradingPlayer.id) ?? teamId,
      toTeamId,
    })
    setTradingPlayer(null)
  }

  return (
    <div key={pulse} className="space-y-5">
      <TeamHeader
        team={team}
        before={before}
        after={after}
        hasTrades={store.hasTrades}
        onRunSimulation={runSimulation}
        simulating={simulating}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-rink-700 bg-rink-900/40 p-4 sm:p-5">
          <RosterBoard team={team} originOf={store.originOf} onTrade={setTradingPlayer} />
          <p className="mt-4 text-center text-[11px] text-slate-600">
            Click any player to trade them. Rosters and ratings are editable estimates, not official.
          </p>
        </div>

        <aside className="space-y-4">
          <RanksPanel before={before} after={after} hasTrades={store.hasTrades} />
          <TradePanel
            assets={store.assets}
            playerById={playerById}
            teamById={teamById}
            onRemove={store.removeAsset}
            onClear={store.clearTrades}
          />
        </aside>
      </div>

      {tradingPlayer && (
        <TradeModal
          player={tradingPlayer}
          fromTeam={team}
          teams={store.baseTeams}
          onConfirm={confirmTrade}
          onClose={() => setTradingPlayer(null)}
        />
      )}
    </div>
  )
}
