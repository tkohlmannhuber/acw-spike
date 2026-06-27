import { z } from 'zod/v4'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { matches } from '../../../database/schema'

const schema = z.object({
  teamAId: z.string().uuid(),
  teamBId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { teamAId, teamBId } = schema.parse(body)

  const db = useDb()
  const [tp] = await db.select().from(matches)
    .where(and(eq(matches.tournamentId, id), eq(matches.phase, 'third_place')))

  if (!tp) throw createError({ statusCode: 404, message: 'No third place match found' })
  if (tp.status === 'finished') return tp

  const [updated] = await db.update(matches)
    .set({ teamAId, teamBId })
    .where(eq(matches.id, tp.id))
    .returning()

  return updated
})
