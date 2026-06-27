import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { matches, teams, tournaments } from '../../database/schema'

const schema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const matchId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { scoreA, scoreB } = schema.parse(body)

  if (scoreA === scoreB) throw createError({ statusCode: 400, message: 'Scores must differ (no tie in Spikeball)' })

  const db = useDb()
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId))
  if (!match) throw createError({ statusCode: 404, message: 'Match not found' })
  if (match.status === 'finished') {
    throw createError({ statusCode: 409, message: 'Match already finished' })
  }

  const winnerId = scoreA > scoreB ? match.teamAId! : match.teamBId!

  const [updated] = await db.update(matches)
    .set({ scoreA, scoreB, winnerId, status: 'finished' })
    .where(eq(matches.id, matchId))
    .returning()

  // Bracket auto-advancement: push winner into next match
  if (updated.nextMatchId && updated.nextMatchSlot) {
    const update = updated.nextMatchSlot === 'a'
      ? { teamAId: winnerId }
      : { teamBId: winnerId }
    await db.update(matches).set(update).where(eq(matches.id, updated.nextMatchId))
  }

  return updated
})
