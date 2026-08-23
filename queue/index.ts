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

/** Starts pg-boss on first use, creating its schema and its queues if they are not there yet. */
export function queue(): Promise<PgBoss> {
  if (!starting) {
    starting = (async () => {
      const boss = new PgBoss({
        connectionString: config().DATABASE_URL,
        schema: config().QUEUE_SCHEMA,
      })
      boss.on('error', (error: Error) => console.error('pg-boss:', error))
      await boss.start()
      for (const name of Object.values(QUEUES)) await boss.createQueue(name)
      return boss
    })()
  }
  return starting
}

export async function stopQueue(): Promise<void> {
  const pending = starting
  starting = undefined
  if (pending) await (await pending).stop({ graceful: true })
}

export async function sendTestJob(payload: TestJobPayload): Promise<string> {
  const id = await (await queue()).send(QUEUES.test, payload)
  if (!id) throw new Error('pg-boss accepted no job id for the test job')
  return id
}
