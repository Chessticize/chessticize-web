import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const skillText = readFileSync('.codex/skills/chessticize-local-dev/SKILL.md', 'utf8')

describe('local dev skill v2 contract', () => {
  it('keeps worker local-run guidance on scoped v2 worker credentials', () => {
    expect(skillText).toContain('CHESSTICIZE_WORKER_TOKEN')
    expect(skillText).toContain('worker-token')
    expect(skillText).toContain('/api/v2/worker/*')
    expect(skillText).toContain('/api/v2/admin/*')

    expect(skillText).not.toContain('worker endpoint constants already include `/api/v1')
    expect(skillText).not.toContain('chessticize admin-token -user-id=test-worker-admin')
  })

  it('keeps browser sign-in expectations on v2 auth and bootstrap routes', () => {
    expect(skillText).toContain('POST /api/v2/auth/firebase-exchange')
    expect(skillText).toContain('GET /api/v2/me/bootstrap')

    expect(skillText).not.toContain('POST /api/v1/auth/firebase-exchange')
    expect(skillText).not.toContain('GET /api/v1/users/me')
  })
})
