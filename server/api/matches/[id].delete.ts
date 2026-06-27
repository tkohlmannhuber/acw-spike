import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { matches } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const matchId = getRouterParam(event, 'id')!
  const db = useDb()

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId))
  if (!match) throw createError({ statusCode: 404, message: 'Match not found' })

  const [updated] = await db.update(matches)
    .set({ scoreA: null, scoreB: null, winnerId: null, status: 'pending' })
    .where(eq(matches.id, matchId))
    .returning()

  return updated
})
