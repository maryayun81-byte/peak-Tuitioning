import { describe, it, expect } from 'vitest'
import { resolveWorkspaceId, TASK_WORKSPACE_MAP } from '@/components/homeschooling/workspaces/registry'

const q = (over: any = {}) => ({ id: 'q1', prompt: 'Test', ...over })

describe('workspace registry', () => {
  it('maps tasks to workspaces, never by subject', () => {
    expect(resolveWorkspaceId(q({ interaction_type: 'BINARY_CONVERSION' }))).toBe('BINARY_BUILDER')
    expect(resolveWorkspaceId(q({ interaction_type: 'HEX_CONVERSION' }))).toBe('HEX_BUILDER')
    expect(resolveWorkspaceId(q({ interaction_type: 'MATCHING' }))).toBe('MATCHING_BOARD')
    expect(resolveWorkspaceId(q({ interaction_type: 'ORDERING' }))).toBe('ORDERING_BOARD')
    expect(resolveWorkspaceId(q({ interaction_type: 'WRITTEN_EXPLANATION' }))).toBe('WRITTEN_RESPONSE')
    expect(resolveWorkspaceId(q({ interaction_type: 'TABLE_COMPLETION' }))).toBe('TABLE_BUILDER')
  })

  it('honors explicit teacher workspace overrides', () => {
    expect(
      resolveWorkspaceId(q({ interaction_type: 'MATCHING', workspace_id: 'WRITTEN_RESPONSE' }))
    ).toBe('WRITTEN_RESPONSE')
  })

  it('falls back to generic for unknown tasks', () => {
    expect(resolveWorkspaceId(q({ interaction_type: 'SOMETHING_NEW' }))).toBe('GENERIC')
    expect(resolveWorkspaceId(q({}))).toBe('GENERIC')
  })

  it('covers every mapped task with metadata', () => {
    for (const target of Object.values(TASK_WORKSPACE_MAP)) {
      expect(target).toBeTruthy()
    }
  })
})
