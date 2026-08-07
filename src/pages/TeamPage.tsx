// The main team view: projection header, roster board, and the ranks +
// injuries + moves sidebar. Tapping a player opens their detail card, or the
// trade flow when Trade mode is on.

import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import type { Player } from '../types'
import { useStore } from '../store'
import { TeamHeader } from '../components/TeamHeader'
import { RosterBoard } from '../components/RosterBoard'
import { RanksPanel } from '../components/RanksPanel'
import { GameDayCard } from '../components/GameDayCard'
import { SchedulePanel } from '../components/SchedulePanel'
import { InjuriesPanel } from '../components/InjuriesPanel'
import { TradePanel } from '../components/TradePanel'
import { TradeModal } from '../components/TradeModal'
import { PlayerDetailModal } from '../components/PlayerDetailModal'
import { STATS_SEASON } from '../data'

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const store = useStore()
  const [tradingPlayer, setTradingPlayer] = useState<Player | null>(null)
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null)

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

  // Players that are "new" on their team: traded in, or signed as free agents.
  const newIds = useMemo(() => {
    const s = new Set(store.signedIds)
    store.originOf.forEach((_origin, id) => s.add(id))
    return s
  }, [store.originOf, store.signedIds])

  if (!team || !teamId) return <Navigate to="/" replace />

  const before = store.before.get(teamId)!
  const after = store.after.get(teamId)!

  const selectPlayer = (p: Player) => {
    if (store.tradeMode) setTradingPlayer(p)
    else setDetailPlayer(p)
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
    <div className="space-y-5">
      <TeamHeader team={team} before={before} after={after} hasTrades={store.hasTrades} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-rink-700 bg-rink-900/40 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Roster</h2>
            <button
              onClick={() => store.setTradeMode(!store.tradeMode)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                store.tradeMode
                  ? 'bg-ice-400 text-rink-950 hover:bg-ice-300'
                  : 'bg-rink-800 text-slate-200 ring-1 ring-rink-700 hover:bg-rink-700'
              }`}
            >
              {store.tradeMode ? '⇄ Trade mode: On' : '⇄ Trade'}
            </button>
          </div>
          <RosterBoard team={team} newIds={newIds} onTrade={selectPlayer} />
          <p className="mt-4 text-center text-[11px] text-slate-600">
            {store.tradeMode
              ? 'Tap any player to move them to another team.'
              : 'Tap a player for details, or “Trade” to start moving players.'}{' '}
            {STATS_SEASON ? `Stat lines are ${STATS_SEASON} totals. ` : ''}Ratings are estimates, not
            official.
          </p>
        </div>

        <aside className="space-y-4">
          <GameDayCard team={team} />
          <SchedulePanel team={team} />
          <RanksPanel before={before} after={after} hasTrades={store.hasTrades} />
          <InjuriesPanel team={team} />
          <TradePanel
            assets={store.assets}
            signings={store.signings}
            playerById={playerById}
            teamById={teamById}
            onRemove={store.removeAsset}
            onRemoveSigning={store.removeSigning}
            onClear={store.clearTrades}
            shareUrl={store.shareUrl}
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

      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          team={team}
          onTrade={(p) => {
            setDetailPlayer(null)
            setTradingPlayer(p)
          }}
          onClose={() => setDetailPlayer(null)}
        />
      )}
    </div>
  )
}
