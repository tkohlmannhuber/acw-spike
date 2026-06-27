export interface BracketTeam {
  teamId: string
  seed: number
}

export interface BracketMatch {
  round: number        // 1 = final, 2 = semi, 4 = quarter, etc. (power of 2 from final)
  position: number     // 1-indexed within the round
  teamAId: string | null
  teamBId: string | null
  isBye: boolean
  nextMatchPosition: number | null
  nextMatchSlot: 'a' | 'b' | null
}

/**
 * Build a single-elimination bracket from seeded teams.
 * Returns match slots in bracket order. Byes are applied to top seeds (lower seed number = better).
 * round=1 is the final, round=2 semis, etc.
 */
export function buildBracket(seededTeams: BracketTeam[]): BracketMatch[] {
  const n = seededTeams.length
  if (n < 2) throw new Error('Need at least 2 teams')

  // Next power of 2 >= n
  const slots = nextPow2(n)
  const byeCount = slots - n

  // Standard bracket seeding: 1 vs slots, 2 vs slots-1, etc.
  // Byes go to top seeds
  const seedings: (BracketTeam | null)[] = [...seededTeams.sort((a, b) => a.seed - b.seed)]
  // Pad with nulls for byes
  while (seedings.length < slots) seedings.push(null)

  const rounds = Math.log2(slots)
  const matches: BracketMatch[] = []

  // Generate first round matches
  const firstRoundPairs = standardPairing(slots)
  for (let i = 0; i < firstRoundPairs.length; i++) {
    const [posA, posB] = firstRoundPairs[i]
    const teamA = seedings[posA - 1]
    const teamB = seedings[posB - 1]
    const isBye = !teamA || !teamB

    const match: BracketMatch = {
      round: rounds,
      position: i + 1,
      teamAId: teamA?.teamId ?? null,
      teamBId: teamB?.teamId ?? null,
      isBye,
      nextMatchPosition: Math.ceil((i + 1) / 2),
      nextMatchSlot: (i % 2 === 0) ? 'a' : 'b',
    }
    matches.push(match)
  }

  // Generate subsequent rounds
  for (let r = rounds - 1; r >= 1; r--) {
    const matchesInRound = Math.pow(2, r - 1)
    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        round: r,
        position: pos,
        teamAId: null,
        teamBId: null,
        isBye: false,
        nextMatchPosition: r > 1 ? Math.ceil(pos / 2) : null,
        nextMatchSlot: r > 1 ? (pos % 2 === 1 ? 'a' : 'b') : null,
      })
    }
  }

  return matches
}

/** Standard bracket pairing: 1 vs 2^n, 2 vs 2^n-1, etc. */
function standardPairing(slots: number): [number, number][] {
  const pairs: [number, number][] = []
  const half = slots / 2
  for (let i = 1; i <= half; i++) {
    pairs.push([i, slots + 1 - i])
  }
  return pairs
}

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}
