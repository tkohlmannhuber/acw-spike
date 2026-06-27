import { z } from 'zod/v4'
import { useDb } from '../../utils/db'
import { tournaments } from '../../database/schema'

const schema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  format: z.enum(['groups_then_ko', 'round_robin_only', 'single_elim_only']).default('groups_then_ko'),
  poolCount: z.number().int().min(1).max(8).default(2),
  qualifiersPerPool: z.number().int().min(1).max(4).default(2),
  scoreMode: z.enum(['single_game', 'best_of_3']).default('single_game'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)

  const db = useDb()
  const [tournament] = await db.insert(tournaments).values({
    name: data.name,
    date: new Date(data.date),
    format: data.format,
    poolCount: data.poolCount,
    qualifiersPerPool: data.qualifiersPerPool,
    scoreMode: data.scoreMode,
  }).returning()

  return tournament
})
