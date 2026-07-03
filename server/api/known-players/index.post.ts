import { z } from 'zod/v4'
import { useDb } from '../../utils/db'
import { knownPlayers } from '../../database/schema'

const schema = z.object({
  names: z.array(z.string().min(1).max(80)).min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { names } = schema.parse(body)
  const db = useDb()

  const inserted = await db
    .insert(knownPlayers)
    .values(names.map(name => ({ name: name.trim() })))
    .onConflictDoNothing()
    .returning()

  return inserted
})
