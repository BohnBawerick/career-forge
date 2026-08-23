import { beforeEach, describe, expect, it, vi } from 'vitest'

const start = vi.fn()
const stop = vi.fn()
const createQueue = vi.fn()
const send = vi.fn()

vi.mock('pg-boss', () => ({
  PgBoss: class {
    on = vi.fn()
    start = start
    stop = stop
    createQueue = createQueue
    send = send
  },
}))

vi.mock('../core/config', () => ({
  config: () => ({ DATABASE_URL: 'postgres://nowhere/none', QUEUE_SCHEMA: 'pgboss' }),
}))

/** A fresh copy of the module, so the memoised start promise does not leak between tests. */
async function loadQueue() {
  vi.resetModules()
  return import('../queue/index')
}

describe('the queue module', () => {
  beforeEach(() => {
    start.mockReset().mockResolvedValue(undefined)
    stop.mockReset().mockResolvedValue(undefined)
    createQueue.mockReset().mockResolvedValue(undefined)
    send.mockReset().mockResolvedValue('job-1')
  })

  it('starts once and reuses the same connection', async () => {
    const { queue } = await loadQueue()

    const [first, second] = await Promise.all([queue(), queue()])

    expect(first).toBe(second)
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('stops cleanly after a start that failed, instead of throwing a second time', async () => {
    const { sendTestJob, stopQueue } = await loadQueue()
    start.mockRejectedValue(new Error('connect ECONNREFUSED'))

    await expect(sendTestJob({ note: 'n', sentAt: 'now' })).rejects.toThrow('ECONNREFUSED')
    await expect(stopQueue()).resolves.toBeUndefined()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalledWith({ graceful: true })
  })

  it('stops cleanly when the shutdown lands while a failing start is still in flight', async () => {
    const { queue, stopQueue } = await loadQueue()
    let failTheStart = (_error: Error): void => {}
    start.mockImplementation(() => new Promise((_resolve, reject) => {
      failTheStart = reject
    }))

    const pending = queue()
    const stopped = stopQueue()
    failTheStart(new Error('connect ECONNREFUSED'))

    await expect(pending).rejects.toThrow('ECONNREFUSED')
    await expect(stopped).resolves.toBeUndefined()
    expect(stop).not.toHaveBeenCalledWith({ graceful: true })
  })

  it('closes the connection pool when the start fails after it has connected', async () => {
    const { queue } = await loadQueue()
    createQueue.mockRejectedValue(new Error('permission denied for schema pgboss'))

    await expect(queue()).rejects.toThrow('permission denied')
    expect(stop).toHaveBeenCalledWith({ graceful: false })
  })

  it('retries the start after a failure rather than caching the rejection', async () => {
    const { queue } = await loadQueue()
    start.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    await expect(queue()).rejects.toThrow('ECONNREFUSED')
    await expect(queue()).resolves.toBeDefined()
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('does not let a failing stop reject on the shutdown path', async () => {
    const { queue, stopQueue } = await loadQueue()
    stop.mockRejectedValue(new Error('already gone'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await queue()

    await expect(stopQueue()).resolves.toBeUndefined()
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
