import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, players } from '../../../database/schema'

const schema = z.object({
  names: z.array(z.string().min(1).max(60)).min(2).max(64),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { names } = schema.parse(body)

  const db = useDb()
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })
  if (!['setup', 'draw_done'].includes(tournament.status)) {
    throw createError({ statusCode: 409, message: 'Cannot modify players after draw is confirmed' })
  }

  // Replace all existing players
  await db.delete(players).where(eq(players.tournamentId, id))

  const inserted = await db.insert(players).values(
    names.map(name => ({ tournamentId: id, name: name.trim() }))
  ).returning()

  return inserted
})
