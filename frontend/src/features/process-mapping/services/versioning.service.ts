import { generateUUID } from '@/lib/utils'
import type { ProcessHistoryEntry } from '../types/process.types'

export const INITIAL_PROCESS_VERSION = '1.0.0'

export function nextCorrectionVersion(version: string): string {
  const parts = version.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  const major = parts[0] ?? 1
  const minor = parts[1] ?? 0
  const patch = parts[2] ?? 0
  return `${major}.${minor}.${patch + 1}`
}

export function nextApprovedChangeVersion(version: string, breaking = false): string {
  const parts = version.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  const major = parts[0] ?? 1
  const minor = parts[1] ?? 0
  return breaking ? `${major + 1}.0.0` : `${major}.${minor + 1}.0`
}

export function createHistoryEntry({
  user,
  version,
  reason,
}: Pick<ProcessHistoryEntry, 'user' | 'version' | 'reason'>): ProcessHistoryEntry {
  return {
    id: generateUUID(),
    date: new Date().toISOString(),
    user,
    version,
    reason,
  }
}
