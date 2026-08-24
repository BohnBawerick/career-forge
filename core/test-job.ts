/**
 * The one job the scaffold ships. It exists to prove the queue works end to end and will be
 * deleted by the first ticket that has real work to run.
 *
 * The handler lives in `core/` on purpose: `worker/` wires pg-boss to it and `server/` could
 * call the same function directly, which is the seam ADR 0004 asks for.
 */
export interface TestJobPayload {
  /** Free text the sender wants echoed back, so a run can be told apart from the one before it. */
  note: string
  sentAt: string
}

export interface TestJobResult {
  note: string
  sentAt: string
  handledAt: string
}

export function runTestJob(payload: TestJobPayload): TestJobResult {
  return {
    note: payload.note,
    sentAt: payload.sentAt,
    handledAt: new Date().toISOString(),
  }
}
