import { describe, expect, it } from 'vitest'
import { runTestJob } from '../core/test-job'

describe('runTestJob', () => {
  it('carries the note and the send time through and stamps when it ran', () => {
    const sentAt = '2026-01-01T00:00:00.000Z'

    const result = runTestJob({ note: 'from a test', sentAt })

    expect(result.note).toBe('from a test')
    expect(result.sentAt).toBe(sentAt)
    expect(Date.parse(result.handledAt)).not.toBeNaN()
  })
})
