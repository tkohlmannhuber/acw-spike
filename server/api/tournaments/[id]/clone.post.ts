import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { tournaments, players, teams } from '../../../database/schema'

const schema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().datetime({ offset: true }).or(z.string().date()),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const data = schema.parse(body)
  const db = useDb()

  const [source] = await db.select().from(tournaments).where(eq(tournaments.id, id))
  if (!source) throw createError({ statusCode: 404, message: 'Turnier nicht gefunden' })

  const sourcePlayers = await db.select().from(players).where(eq(players.tournamentId, id))
  const sourceTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, id))

  // Create new tournament with same settings
  const [newTournament] = await db.insert(tournaments).values({
    name: data.name,
    date: new Date(data.date),
    format: source.format,
    poolCount: source.poolCount,
    qualifiersPerPool: source.qualifiersPerPool,
    scoreMode: source.scoreMode,
    status: 'draw_done',
  }).returning()

  // Copy players, track old → new id mapping
  const playerIdMap = new Map<string, string>()
  if (sourcePlayers.length > 0) {
    const newPlayers = await db.insert(players).values(
      sourcePlayers.map(p => ({
        tournamentId: newTournament.id,
        name: p.name,
        isSubstitute: p.isSubstitute,
      }))
    ).returning()

    sourcePlayers.forEach((oldP, i) => {
      playerIdMap.set(oldP.id, newPlayers[i].id)
    })
  }

  // Copy teams with remapped player IDs, reset pool/seed
  if (sourceTeams.length > 0) {
    await db.insert(teams).values(
      sourceTeams.map(t => ({
        tournamentId: newTournament.id,
        name: t.name,
        player1Id: playerIdMap.get(t.player1Id)!,
        player2Id: t.player2Id ? playerIdMap.get(t.player2Id) ?? null : null,
        player3Id: t.player3Id ? playerIdMap.get(t.player3Id) ?? null : null,
        poolId: null,
        seed: null,
      }))
    )
  }

  return { id: newTournament.id }
})
