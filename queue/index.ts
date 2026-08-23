import { PgBoss } from 'pg-boss'
import { config } from '../core/config'
import type { TestJobPayload } from '../core/test-job'

/**
 * The only module that talks to pg-boss.
 *
 * Every send goes through a named function here, so the set of jobs the application can start is
 * the export list of this file and nothing else. `worker/` consumes; `server/` and `core/` send.
 */

export const QUEUES = {
  test: 'career-forge.test',
} as const

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

let starting: Promise<PgBoss> | undefined

/**
 * Starts pg-boss on first use, creating its schema and its queues if they are not there yet.
 *
 * A failed start is not memoised, so a caller that survives it can try again.
 */
export function queue(): Promise<PgBoss> {
  if (!starting) {
    const attempt = (async () => {
      const boss = new PgBoss({
        connectionString: config().DATABASE_URL,
        schema: config().QUEUE_SCHEMA,
      })
      boss.on('error', (error: Error) => console.error('pg-boss:', error))
      await boss.start()
      for (const name of Object.values(QUEUES)) await boss.createQueue(name)
      return boss
    })()
    attempt.catch(() => {
      if (starting === attempt) starting = undefined
    })
    starting = attempt
  }
  return starting
}

/**
 * Shuts pg-boss down. Never rejects: every caller is a shutdown path (a `finally`, a signal
 * handler) where a rejection has nowhere left to go and would take the process down instead of
 * the error that caused the shutdown.
 */
export async function stopQueue(): Promise<void> {
  const pending = starting
  starting = undefined
  if (!pending) return

  const boss = await pending.catch(() => undefined)
  if (!boss) return

  try {
    await boss.stop({ graceful: true })
  }
  catch (error) {
    console.error('pg-boss: stop failed:', error)
  }
}

export async function sendTestJob(payload: TestJobPayload): Promise<string> {
  const id = await (await queue()).send(QUEUES.test, payload)
  if (!id) throw new Error('pg-boss accepted no job id for the test job')
  return id
}
