import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { tournaments, players, teams, pools, matches } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })

  const [tournamentPlayers, tournamentTeams, tournamentPools, tournamentMatches] = await Promise.all([
    db.select().from(players).where(eq(players.tournamentId, id)),
    db.select().from(teams).where(eq(teams.tournamentId, id)),
    db.select().from(pools).where(eq(pools.tournamentId, id)),
    db.select().from(matches).where(eq(matches.tournamentId, id)),
  ])

  return {
    ...tournament,
    players: tournamentPlayers,
    teams: tournamentTeams,
    pools: tournamentPools,
    matches: tournamentMatches,
  }
})
