export interface Player {
  id: string
  name: string
  isSubstitute: boolean
}

export interface DrawTeam {
  name: string
  player1Id: string
  player2Id: string | null
  player3Id: string | null
}

/**
 * Schedule matches so no team plays two games in a row.
 * Uses a greedy algorithm: always pick the next match that doesn't
 * conflict with the previous one. Falls back gracefully when
 * unavoidable (e.g. only 4 teams where it's mathematically impossible).
 */
export function scheduleMatches<T extends { teamAId?: string | null; teamBId?: string | null }>(
  matches: T[],
): T[] {
  const remaining = shuffle([...matches])
  const result: T[] = []

  while (remaining.length > 0) {
    const last = result[result.length - 1]
    const busy = last ? new Set([last.teamAId, last.teamBId]) : new Set<string | null | undefined>()

    const idx = remaining.findIndex(m => !busy.has(m.teamAId) && !busy.has(m.teamBId))
    result.push(remaining.splice(idx === -1 ? 0 : idx, 1)[0])
  }

  return result
}

/** Fisher-Yates shuffle — mutates and returns the array */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Given a shuffled list of players, form 2-player teams.
 * - Even count: pure 2-player teams.
 * - Odd count with tripleIndex set: one 3-player team at that pair index.
 * - Odd count without tripleIndex: last player is marked substitute (not in a team).
 *
 * Returns the generated DrawTeam list (does not touch the DB).
 */
export function formTeams(
  players: Player[],
  tripleIndex?: number,
): DrawTeam[] {
  const active = players.filter(p => !p.isSubstitute)
  const shuffled = shuffle([...active])

  const teams: DrawTeam[] = []
  let i = 0

  while (i < shuffled.length) {
    const p1 = shuffled[i]
    const p2 = shuffled[i + 1]
    const p3 = shuffled[i + 2]

    if (!p2) {
      // Only one player left — they should be marked substitute externally
      break
    }

    // Form a 3-player team if this is the designated triple slot
    if (p3 && teams.length === (tripleIndex ?? -1)) {
      teams.push({
        name: `${p1.name}, ${p2.name} & ${p3.name}`,
        player1Id: p1.id,
        player2Id: p2.id,
        player3Id: p3.id,
      })
      i += 3
    } else {
      teams.push({
        name: `${p1.name} & ${p2.name}`,
        player1Id: p1.id,
        player2Id: p2.id,
        player3Id: null,
      })
      i += 2
    }
  }

  return teams
}
