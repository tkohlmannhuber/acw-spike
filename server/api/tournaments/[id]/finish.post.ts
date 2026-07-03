import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })
  if (tournament.format !== 'round_robin_only') {
    throw createError({ statusCode: 409, message: 'Only for round_robin_only tournaments' })
  }

  await db.update(tournaments).set({ status: 'finished' }).where(eq(tournaments.id, id))
  return { ok: true }
})
