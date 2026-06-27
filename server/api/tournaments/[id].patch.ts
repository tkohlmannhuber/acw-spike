import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { tournaments } from '../../database/schema'

const schema = z.object({
  status: z.enum(['setup', 'draw_done', 'group_stage', 'ko_stage', 'finished']).optional(),
  name: z.string().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const data = schema.parse(body)

  const db = useDb()
  const [updated] = await db.update(tournaments)
    .set(data)
    .where(eq(tournaments.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Tournament not found' })
  return updated
})
