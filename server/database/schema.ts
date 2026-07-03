import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tournamentFormatEnum = pgEnum('tournament_format', [
  'groups_then_ko',
  'round_robin_only',
  'single_elim_only',
])

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'setup',
  'draw_done',
  'group_stage',
  'ko_stage',
  'finished',
])

export const matchPhaseEnum = pgEnum('match_phase', [
  'group',
  'ko',
  'third_place',
])

export const matchStatusEnum = pgEnum('match_status', [
  'pending',
  'live',
  'finished',
])

export const nextMatchSlotEnum = pgEnum('next_match_slot', ['a', 'b'])

export const scoreModeEnum = pgEnum('score_mode', [
  'single_game',
  'best_of_3',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const knownPlayers = pgTable('known_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => [unique().on(t.name)])

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  format: tournamentFormatEnum('format').notNull().default('groups_then_ko'),
  status: tournamentStatusEnum('status').notNull().default('setup'),
  poolCount: integer('pool_count').notNull().default(2),
  qualifiersPerPool: integer('qualifiers_per_pool').notNull().default(2),
  scoreMode: scoreModeEnum('score_mode').notNull().default('single_game'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isSubstitute: boolean('is_substitute').notNull().default(false),
})

export const pools = pgTable('pools', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
})

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  player1Id: uuid('player1_id').notNull().references(() => players.id),
  player2Id: uuid('player2_id').references(() => players.id),
  player3Id: uuid('player3_id').references(() => players.id),
  poolId: uuid('pool_id').references(() => pools.id),
  seed: integer('seed'),
})

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  phase: matchPhaseEnum('phase').notNull(),
  poolId: uuid('pool_id').references(() => pools.id),
  round: integer('round'),
  bracketPosition: integer('bracket_position'),
  teamAId: uuid('team_a_id').references(() => teams.id),
  teamBId: uuid('team_b_id').references(() => teams.id),
  scoreA: integer('score_a'),
  scoreB: integer('score_b'),
  winnerId: uuid('winner_id').references(() => teams.id),
  status: matchStatusEnum('status').notNull().default('pending'),
  nextMatchId: uuid('next_match_id').references(() => matches.id),
  nextMatchSlot: nextMatchSlotEnum('next_match_slot'),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  players: many(players),
  teams: many(teams),
  pools: many(pools),
  matches: many(matches),
}))

export const playersRelations = relations(players, ({ one }) => ({
  tournament: one(tournaments, { fields: [players.tournamentId], references: [tournaments.id] }),
}))

export const poolsRelations = relations(pools, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [pools.tournamentId], references: [tournaments.id] }),
  teams: many(teams),
  matches: many(matches),
}))

export const teamsRelations = relations(teams, ({ one }) => ({
  tournament: one(tournaments, { fields: [teams.tournamentId], references: [tournaments.id] }),
  player1: one(players, { fields: [teams.player1Id], references: [players.id], relationName: 'player1' }),
  player2: one(players, { fields: [teams.player2Id], references: [players.id], relationName: 'player2' }),
  player3: one(players, { fields: [teams.player3Id], references: [players.id], relationName: 'player3' }),
  pool: one(pools, { fields: [teams.poolId], references: [pools.id] }),
}))

export const matchesRelations = relations(matches, ({ one }) => ({
  tournament: one(tournaments, { fields: [matches.tournamentId], references: [tournaments.id] }),
  pool: one(pools, { fields: [matches.poolId], references: [pools.id] }),
  teamA: one(teams, { fields: [matches.teamAId], references: [teams.id], relationName: 'teamA' }),
  teamB: one(teams, { fields: [matches.teamBId], references: [teams.id], relationName: 'teamB' }),
  winner: one(teams, { fields: [matches.winnerId], references: [teams.id], relationName: 'winner' }),
  nextMatch: one(matches, { fields: [matches.nextMatchId], references: [matches.id], relationName: 'nextMatch' }),
}))
