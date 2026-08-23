import 'dotenv/config'
import { runTestJob } from '../core/test-job'
import type { TestJobPayload } from '../core/test-job'
import type { Job } from 'pg-boss'
import { QUEUES, queue, stopQueue } from '../queue/index'

/**
 * The pg-boss consumer. Runs from the same image as the web app with a different start command
 * (ADR 0004), and imports `core/` for the work itself.
 */
async function main(): Promise<void> {
  const boss = await queue()

  await boss.work<TestJobPayload>(QUEUES.test, async (jobs: Job<TestJobPayload>[]) => {
    for (const job of jobs) {
      const result = runTestJob(job.data)
      console.log(
        `Picked test job ${job.id}: "${result.note}" sent ${result.sentAt}, handled ${result.handledAt}`,
      )
    }
  })

  console.log(`Worker listening on ${Object.values(QUEUES).join(', ')}. Ctrl-C to stop.`)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void stopQueue().then(() => process.exit(0))
  })
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
