import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, pools, teams, matches } from '../../../database/schema'
import { computeStandings, sortStandings } from '../../../utils/standings'
import { buildBracket } from '../../../utils/bracket'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })

  if (!['draw_done', 'group_stage'].includes(tournament.status)) {
    throw createError({ statusCode: 409, message: 'Tournament not ready for KO phase' })
  }

  // Delete any existing KO matches
  await db.delete(matches)
    .where(and(eq(matches.tournamentId, id), inArray(matches.phase, ['ko', 'third_place'])))

  let qualifiers: { teamId: string; seed: number }[] = []

  if (tournament.format === 'single_elim_only') {
    // All teams qualify, seeded by original draw order
    const allTeams = await db.select().from(teams).where(eq(tournaments.id, id))
    qualifiers = allTeams.map((t, i) => ({ teamId: t.id, seed: i + 1 }))
  } else {
    // Groups: take top N from each pool, cross-seed (1A vs 2B, 1B vs 2A)
    const allPools = await db.select().from(pools).where(eq(pools.tournamentId, id))
    const allGroupMatches = await db.select().from(matches)
      .where(and(eq(matches.tournamentId, id), eq(matches.phase, 'group')))
    const allTeams = await db.select().from(teams).where(eq(teams.tournamentId, id))

    const qualPerPool = tournament.qualifiersPerPool
    const poolResults: { pool: number; teamId: string; rank: number }[] = []

    for (let i = 0; i < allPools.length; i++) {
      const pool = allPools[i]
      const poolMatches = allGroupMatches.filter(m => m.poolId === pool.id)
      const poolTeams = allTeams.filter(t => t.poolId === pool.id)
      const standingsMap = computeStandings(poolMatches)

      for (const team of poolTeams) {
        if (!standingsMap.has(team.id)) {
          standingsMap.set(team.id, { teamId: team.id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0, played: 0 })
        }
      }

      const sorted = sortStandings([...standingsMap.values()])
      for (let rank = 0; rank < Math.min(qualPerPool, sorted.length); rank++) {
        poolResults.push({ pool: i, teamId: sorted[rank].teamId, rank })
      }
    }

    // Cross-seed: interleave pool results by rank
    // Rank 0 from pool 0 → seed 1, Rank 0 from pool 1 → seed 2, Rank 1 from pool 0 → seed 3, etc.
    const maxRank = qualPerPool
    for (let rank = 0; rank < maxRank; rank++) {
      const byRank = poolResults.filter(r => r.rank === rank).sort((a, b) => a.pool - b.pool)
      for (let p = 0; p < byRank.length; p++) {
        qualifiers.push({ teamId: byRank[p].teamId, seed: rank * allPools.length + p + 1 })
      }
    }
  }

  if (qualifiers.length < 2) {
    throw createError({ statusCode: 400, message: 'Need at least 2 qualifiers for KO phase' })
  }

  // Build bracket structure
  const bracket = buildBracket(qualifiers)

  // Insert all bracket matches — need IDs to wire up next_match_id
  // Insert in order: final (round=1) first so we have IDs for later rounds
  const roundsDesc = [...new Set(bracket.map(m => m.round))].sort((a, b) => a - b)

  // Map (round, position) → inserted match id
  const matchIdMap = new Map<string, string>()

  for (const round of roundsDesc) {
    const roundMatches = bracket.filter(m => m.round === round).sort((a, b) => a.position - b.position)
    const inserted = await db.insert(matches).values(
      roundMatches.map(m => {
        const nextId = m.nextMatchPosition != null
          ? matchIdMap.get(`${round - 1}:${m.nextMatchPosition}`)
          : undefined

        // Resolve bye: if one side is null, auto-advance the other
        const effectiveTeamAId = m.teamAId
        const effectiveTeamBId = m.teamBId

        return {
          tournamentId: id,
          phase: 'ko' as const,
          round: m.round,
          bracketPosition: m.position,
          teamAId: effectiveTeamAId,
          teamBId: effectiveTeamBId,
          status: m.isBye ? 'finished' as const : 'pending' as const,
          winnerId: m.isBye ? (effectiveTeamAId ?? effectiveTeamBId) : null,
          nextMatchId: nextId ?? null,
          nextMatchSlot: m.nextMatchSlot,
        }
      })
    ).returning()

    for (const m of inserted) {
      matchIdMap.set(`${m.round}:${m.bracketPosition}`, m.id)
      // Auto-advance byes
      if (m.status === 'finished' && m.winnerId && m.nextMatchId && m.nextMatchSlot) {
        const update = m.nextMatchSlot === 'a' ? { teamAId: m.winnerId } : { teamBId: m.winnerId }
        await db.update(matches).set(update).where(eq(matches.id, m.nextMatchId))
      }
    }
  }

  // Create 3rd place match (from semi-final losers = round 2 matches)
  const semiIds = bracket.filter(m => m.round === 2).map(m => matchIdMap.get(`${m.round}:${m.position}`)).filter(Boolean) as string[]
  if (semiIds.length >= 2) {
    await db.insert(matches).values({
      tournamentId: id,
      phase: 'third_place',
      status: 'pending',
    })
  }

  // Update seeding on teams
  for (const q of qualifiers) {
    await db.update(teams).set({ seed: q.seed }).where(eq(teams.id, q.teamId))
  }

  await db.update(tournaments).set({ status: 'ko_stage' }).where(eq(tournaments.id, id))

  const koMatches = await db.select().from(matches)
    .where(and(eq(matches.tournamentId, id), inArray(matches.phase, ['ko', 'third_place'])))

  return koMatches
})
