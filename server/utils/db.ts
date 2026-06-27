import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const url = config.databaseUrl || process.env.DATABASE_URL

    if (!url) {
      throw new Error('DATABASE_URL is not set')
    }

    const client = postgres(url, {
      max: 10,
      ssl: url.includes('sslmode=require') || url.includes('railway') ? 'require' : undefined,
    })

    _db = drizzle(client, { schema })
  }
  return _db
}
