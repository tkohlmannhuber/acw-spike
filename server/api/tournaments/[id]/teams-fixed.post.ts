import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, players, teams } from '../../../database/schema'

const schema = z.object({
  playerNames: z.array(z.string().min(1)),
  teamPairs: z.array(z.array(z.string().min(1)).min(1).max(3)),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const data = schema.parse(body)
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Turnier nicht gefunden' })

  // Save players
  await db.delete(players).where(eq(players.tournamentId, id))
  await db.delete(teams).where(eq(teams.tournamentId, id))

  const insertedPlayers = await db.insert(players).values(
    data.playerNames.map(name => ({ tournamentId: id, name }))
  ).returning()

  const nameToId = new Map(insertedPlayers.map(p => [p.name, p.id]))

  // Create teams from pairs
  const teamValues = data.teamPairs.map(pair => {
    const [p1, p2, p3] = pair
    const p1Id = nameToId.get(p1)
    if (!p1Id) throw createError({ statusCode: 400, message: `Spieler nicht gefunden: ${p1}` })
    const name = pair.join(' & ')
    return {
      tournamentId: id,
      name,
      player1Id: p1Id,
      player2Id: p2 ? (nameToId.get(p2) ?? null) : null,
      player3Id: p3 ? (nameToId.get(p3) ?? null) : null,
    }
  })

  const createdTeams = await db.insert(teams).values(teamValues).returning()
  await db.update(tournaments).set({ status: 'draw_done' }).where(eq(tournaments.id, id))

  return { teams: createdTeams }
})
