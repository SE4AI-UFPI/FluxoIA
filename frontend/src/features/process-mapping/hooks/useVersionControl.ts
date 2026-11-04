import {
  createHistoryEntry,
  INITIAL_PROCESS_VERSION,
  nextApprovedChangeVersion,
  nextCorrectionVersion,
} from '../services/versioning.service'

export function useVersionControl() {
  return {
    initialVersion: INITIAL_PROCESS_VERSION,
    nextApprovedChangeVersion,
    nextCorrectionVersion,
    createHistoryEntry,
  }
}