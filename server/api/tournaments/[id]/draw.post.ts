import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, players, teams } from '../../../database/schema'
import { formTeams } from '../../../utils/draw'

const schema = z.object({
  /** Index of the team that becomes a trio (for odd player counts). -1 = no trio (last player is substitute). */
  tripleIndex: z.number().int().min(-1).optional(),
  substitutePlayerId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { tripleIndex, substitutePlayerId } = schema.parse(body)

  const db = useDb()
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })
  if (tournament.status === 'group_stage' || tournament.status === 'ko_stage') {
    throw createError({ statusCode: 409, message: 'Turnier already in progress' })
  }

  const allPlayers = await db.select().from(players).where(eq(players.tournamentId, id))
  if (allPlayers.length < 2) throw createError({ statusCode: 400, message: 'Need at least 2 players' })

  // Mark substitute if specified
  if (substitutePlayerId) {
    await db.update(players)
      .set({ isSubstitute: true })
      .where(eq(players.id, substitutePlayerId))
  }
  // Reset any previous substitute flags (except current one)
  await db.update(players)
    .set({ isSubstitute: false })
    .where(eq(players.tournamentId, id))
  if (substitutePlayerId) {
    await db.update(players)
      .set({ isSubstitute: true })
      .where(eq(players.id, substitutePlayerId))
  }

  const freshPlayers = await db.select().from(players).where(eq(players.tournamentId, id))
  const drawTeams = formTeams(
    freshPlayers,
    tripleIndex !== undefined && tripleIndex >= 0 ? tripleIndex : undefined,
  )

  // Delete existing teams & re-draw
  await db.delete(teams).where(eq(teams.tournamentId, id))
  const inserted = await db.insert(teams).values(
    drawTeams.map(t => ({
      tournamentId: id,
      name: t.name,
      player1Id: t.player1Id,
      player2Id: t.player2Id,
      player3Id: t.player3Id,
    }))
  ).returning()

  await db.update(tournaments).set({ status: 'draw_done' }).where(eq(tournaments.id, id))

  return { teams: inserted, players: freshPlayers }
})
