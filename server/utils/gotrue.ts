import { GoTrueError } from '~~/core/gotrue'
import * as gotrue from '~~/core/gotrue'

export type { GoTrueSession, GoTrueUser } from '~~/core/gotrue'

/**
 * `core/gotrue.ts` throws plain errors because it has no h3. This is the one place that turns
 * them into HTTP ones, so a route can call GoTrue and let the failure travel.
 */
async function http<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  }
  catch (error) {
    if (error instanceof GoTrueError) {
      throw createError({ statusCode: error.status, statusMessage: error.message })
    }
    throw error
  }
}

export const createGoTrueUser = (email: string, password: string) =>
  http(gotrue.createGoTrueUser(email, password))

export const deleteGoTrueUser = (id: string) => http(gotrue.deleteGoTrueUser(id))

export const signInWithPassword = (email: string, password: string) =>
  http(gotrue.signInWithPassword(email, password))

export const authUserIdFromToken = (token: string) => http(gotrue.authUserIdFromToken(token))
