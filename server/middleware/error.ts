import { ZodError } from 'zod/v4'

export default defineEventHandler((event) => {
  event.context._onError = (err: unknown) => {
    if (err instanceof ZodError) {
      throw createError({
        statusCode: 400,
        message: err.issues.map(i => i.message).join('; '),
      })
    }
  }
})
