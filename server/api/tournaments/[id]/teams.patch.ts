import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { teams } from '../../../database/schema'

const schema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(80),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { teamId, name } = schema.parse(body)

  const db = useDb()
  const [updated] = await db.update(teams)
    .set({ name: name.trim() })
    .where(eq(teams.id, teamId))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Team not found' })
  return updated
})
