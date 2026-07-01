import { describe, expect, it } from 'vitest'
import { TEAMS, getTeam } from '../data'
import { projectLeague } from './engine'
import { applyTrades } from './trades'

describe('projectLeague', () => {
  it('projects all 32 teams with sane numbers', () => {
    const proj = projectLeague(TEAMS)
    expect(proj.size).toBe(32)
    for (const p of proj.values()) {
      expect(p.points).toBeGreaterThan(50)
      expect(p.points).toBeLessThan(130)
      expect(p.playoffOdds).toBeGreaterThanOrEqual(0)
      expect(p.playoffOdds).toBeLessThanOrEqual(100)
      expect(p.ranks.offense).toBeGreaterThanOrEqual(1)
      expect(p.ranks.offense).toBeLessThanOrEqual(32)
    }
  })

  it('cup odds sum to roughly 100% across the league', () => {
    const proj = projectLeague(TEAMS)
    const total = [...proj.values()].reduce((a, b) => a + b.cupOdds, 0)
    expect(total).toBeGreaterThan(95)
    expect(total).toBeLessThan(105)
  })
})

describe('applyTrades', () => {
  it('moves a star and shifts both teams the expected direction', () => {
    const edm = getTeam('EDM')!
    const mcdavid = edm.roster.find((p) => p.name === 'Connor McDavid')!

    const before = projectLeague(TEAMS)
    const applied = applyTrades(TEAMS, [
      { playerId: mcdavid.id, fromTeamId: 'EDM', toTeamId: 'CHI' },
    ])
    const after = projectLeague(applied.teams)

    // Chicago should get better, Edmonton worse, after landing McDavid.
    expect(after.get('CHI')!.strength).toBeGreaterThan(before.get('CHI')!.strength)
    expect(after.get('EDM')!.strength).toBeLessThan(before.get('EDM')!.strength)

    // The player physically moved rosters.
    const chiAfter = applied.teams.find((t) => t.id === 'CHI')!
    const edmAfter = applied.teams.find((t) => t.id === 'EDM')!
    expect(chiAfter.roster.some((p) => p.id === mcdavid.id)).toBe(true)
    expect(edmAfter.roster.some((p) => p.id === mcdavid.id)).toBe(false)
    expect(applied.originOf.get(mcdavid.id)).toBe('EDM')
  })
})
