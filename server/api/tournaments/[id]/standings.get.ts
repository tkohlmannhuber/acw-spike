import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, pools, teams, matches, players } from '../../../database/schema'
import { computeStandings, sortStandings } from '../../../utils/standings'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })

  const [allPools, allTeams, allPlayers, allMatches] = await Promise.all([
    db.select().from(pools).where(eq(pools.tournamentId, id)),
    db.select().from(teams).where(eq(teams.tournamentId, id)),
    db.select().from(players).where(eq(players.tournamentId, id)),
    db.select().from(matches).where(eq(matches.tournamentId, id)),
  ])

  const playerMap = new Map(allPlayers.map(p => [p.id, p]))
  const teamMap = new Map(allTeams.map(t => [t.id, t]))
  const groupMatches = allMatches.filter(m => m.phase === 'group')

  const result = allPools.map(pool => {
    const poolMatches = groupMatches.filter(m => m.poolId === pool.id)
    const poolTeams = allTeams.filter(t => t.poolId === pool.id)
    const standingsMap = computeStandings(poolMatches)

    // Ensure all pool teams appear in standings (even with 0 matches played)
    for (const team of poolTeams) {
      if (!standingsMap.has(team.id)) {
        standingsMap.set(team.id, {
          teamId: team.id,
          wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0, played: 0,
        })
      }
    }

    const sorted = sortStandings([...standingsMap.values()])

    return {
      pool,
      standings: sorted.map((s, rank) => {
        const team = teamMap.get(s.teamId)!
        const p1 = team?.player1Id ? playerMap.get(team.player1Id) : null
        const p2 = team?.player2Id ? playerMap.get(team.player2Id) : null
        return { rank: rank + 1, team, players: [p1, p2].filter(Boolean), ...s }
      }),
      matches: poolMatches.map(m => ({
        ...m,
        teamA: teamMap.get(m.teamAId ?? '') ?? null,
        teamB: teamMap.get(m.teamBId ?? '') ?? null,
      })),
    }
  })

  return result
})
