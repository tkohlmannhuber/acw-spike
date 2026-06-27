export interface MatchResult {
  teamAId: string | null
  teamBId: string | null
  scoreA: number | null
  scoreB: number | null
  status: string
}

export interface Standing {
  teamId: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
  played: number
}

/** Compute pool standings from match results. Pure function — no DB access. */
export function computeStandings(matches: MatchResult[]): Map<string, Standing> {
  const standings = new Map<string, Standing>()

  function get(id: string): Standing {
    if (!standings.has(id)) {
      standings.set(id, { teamId: id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0, played: 0 })
    }
    return standings.get(id)!
  }

  for (const m of matches) {
    if (m.status !== 'finished' || m.teamAId == null || m.teamBId == null || m.scoreA == null || m.scoreB == null) continue

    const a = get(m.teamAId)
    const b = get(m.teamBId)

    a.played++
    b.played++
    a.pointsFor += m.scoreA
    a.pointsAgainst += m.scoreB
    b.pointsFor += m.scoreB
    b.pointsAgainst += m.scoreA

    if (m.scoreA > m.scoreB) {
      a.wins++
      b.losses++
    } else {
      b.wins++
      a.losses++
    }

    a.pointDiff = a.pointsFor - a.pointsAgainst
    b.pointDiff = b.pointsFor - b.pointsAgainst
  }

  return standings
}

/** Sort standings: wins DESC → pointDiff DESC → pointsFor DESC */
export function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff
    return b.pointsFor - a.pointsFor
  })
}
