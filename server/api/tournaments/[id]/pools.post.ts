import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, teams, pools, matches } from '../../../database/schema'
import { shuffle, scheduleMatches } from '../../../utils/draw'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })
  if (tournament.status !== 'draw_done') {
    throw createError({ statusCode: 409, message: 'Draw must be confirmed first' })
  }

  const allTeams = await db.select().from(teams).where(eq(teams.tournamentId, id))
  if (allTeams.length < 2) throw createError({ statusCode: 400, message: 'Need at least 2 teams' })

  // Clean up previous pools/matches
  await db.delete(matches).where(eq(matches.tournamentId, id))
  await db.delete(pools).where(eq(pools.tournamentId, id))

  const poolCount = tournament.format === 'round_robin_only' ? 1 : tournament.poolCount
  const shuffledTeams = shuffle([...allTeams])

  // Create pools
  const poolNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const createdPools = await db.insert(pools).values(
    Array.from({ length: poolCount }, (_, i) => ({
      tournamentId: id,
      name: `Pool ${poolNames[i]}`,
    }))
  ).returning()

  // Distribute teams snake-draft style
  const teamPoolMap: { teamId: string; poolId: string }[] = []
  for (let i = 0; i < shuffledTeams.length; i++) {
    const poolIndex = i % poolCount
    teamPoolMap.push({ teamId: shuffledTeams[i].id, poolId: createdPools[poolIndex].id })
  }

  // Update teams with pool assignment
  for (const { teamId, poolId } of teamPoolMap) {
    await db.update(teams).set({ poolId }).where(eq(teams.id, teamId))
  }

  // Generate round-robin matches per pool, shuffled so no team plays all its games in a row
  const matchesToInsert: typeof matches.$inferInsert[] = []

  for (const pool of createdPools) {
    const poolTeams = teamPoolMap.filter(t => t.poolId === pool.id).map(t => t.teamId)
    const pairs: typeof matches.$inferInsert[] = []
    for (let i = 0; i < poolTeams.length; i++) {
      for (let j = i + 1; j < poolTeams.length; j++) {
        pairs.push({
          tournamentId: id,
          phase: 'group',
          poolId: pool.id,
          teamAId: poolTeams[i],
          teamBId: poolTeams[j],
          status: 'pending',
        })
      }
    }
    matchesToInsert.push(...scheduleMatches(pairs))
  }

  const createdMatches = matchesToInsert.length > 0
    ? await db.insert(matches).values(matchesToInsert).returning()
    : []

  await db.update(tournaments).set({ status: 'group_stage' }).where(eq(tournaments.id, id))

  return {
    pools: createdPools,
    matches: createdMatches,
  }
})
