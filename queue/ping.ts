import 'dotenv/config'
import { sendTestJob, stopQueue } from './index'

/**
 * Puts one test job on the queue, so `pnpm worker` has something to pick up.
 *
 *   pnpm queue:ping "any note you like"
 */
async function main(): Promise<void> {
  const note = process.argv.slice(2).join(' ') || 'hello from queue:ping'
  const id = await sendTestJob({ note, sentAt: new Date().toISOString() })
  console.log(`Sent test job ${id}: ${note}`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => stopQueue())
