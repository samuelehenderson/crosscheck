// Applies pending trades to the base league to produce the "after" league.
//
// A trade asset simply says "player X moves from team A to team B". Applying
// the full list yields a new set of Team objects with rosters rearranged; the
// simulator then projects that hypothetical league. Nothing here mutates the
// base data.

import type { Player, Team, TradeAsset } from '../types'

export interface AppliedLeague {
  teams: Team[]
  /** playerId -> the team id they belong to after trades. */
  ownerOf: Map<string, string>
  /** playerId -> the team id they started on (only for moved players). */
  originOf: Map<string, string>
}

/** Build a fast lookup of which player currently sits on which team. */
function buildOwnership(teams: Team[]): Map<string, string> {
  const owner = new Map<string, string>()
  teams.forEach((t) => t.roster.forEach((p) => owner.set(p.id, t.id)))
  return owner
}

/**
 * Return a new league with every asset's player moved to their destination.
 * Assets are applied in order; a later asset can re-route a player moved by an
 * earlier one, so the final destination wins.
 */
export function applyTrades(baseTeams: Team[], assets: TradeAsset[]): AppliedLeague {
  const playerById = new Map<string, Player>()
  baseTeams.forEach((t) => t.roster.forEach((p) => playerById.set(p.id, p)))

  const origin = buildOwnership(baseTeams)
  const owner = new Map(origin)
  assets.forEach((a) => {
    if (playerById.has(a.playerId)) owner.set(a.playerId, a.toTeamId)
  })

  const rosters = new Map<string, Player[]>()
  baseTeams.forEach((t) => rosters.set(t.id, []))
  playerById.forEach((player, id) => {
    const teamId = owner.get(id)!
    rosters.get(teamId)?.push(player)
  })

  const teams = baseTeams.map((t) => ({ ...t, roster: rosters.get(t.id) ?? [] }))

  // Only surface an origin entry for players who actually changed teams.
  const originOf = new Map<string, string>()
  owner.forEach((teamId, playerId) => {
    const start = origin.get(playerId)!
    if (start !== teamId) originOf.set(playerId, start)
  })

  return { teams, ownerOf: owner, originOf }
}
