import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, pools, matches } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!tournament) throw createError({ statusCode: 404, message: 'Tournament not found' })

  await db.delete(matches).where(eq(matches.tournamentId, id))
  await db.delete(pools).where(eq(pools.tournamentId, id))
  await db.update(tournaments).set({ status: 'draw_done' }).where(eq(tournaments.id, id))

  return { ok: true }
})
