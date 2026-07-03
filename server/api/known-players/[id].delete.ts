import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { knownPlayers } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  await db.delete(knownPlayers).where(eq(knownPlayers.id, id))
  return { ok: true }
})
