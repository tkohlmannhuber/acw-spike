import { useDb } from '../../utils/db'
import { tournaments } from '../../database/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt))
})
