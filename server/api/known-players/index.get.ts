import { asc } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { knownPlayers } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(knownPlayers).orderBy(asc(knownPlayers.name))
})
