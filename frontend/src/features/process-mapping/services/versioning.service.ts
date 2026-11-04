import type { ProcessHistoryEntry } from '../types/process.types'

export const INITIAL_PROCESS_VERSION = '1.0.0'

export function nextCorrectionVersion(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

export function nextApprovedChangeVersion(version: string, breaking = false): string {
  const [major, minor] = version.split('.').map(Number)
  return breaking ? `${major + 1}.0.0` : `${major}.${minor + 1}.0`
}

export function createHistoryEntry({
  user,
  version,
  reason,
}: Pick<ProcessHistoryEntry, 'user' | 'version' | 'reason'>): ProcessHistoryEntry {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    user,
    version,
    reason,
  }
}