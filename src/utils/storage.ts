import { SEED_SESSIONS } from '../data/seedSessions';
import type { TrainingSessionRecord } from '../types';

const STORAGE_KEY = 'grand_aurelia_cs_training_sessions_v1';

export function loadTrainingSessions(): TrainingSessionRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SESSIONS));
      return SEED_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as TrainingSessionRecord[];
    }
    return SEED_SESSIONS;
  } catch {
    return SEED_SESSIONS;
  }
}

export function saveTrainingSessions(sessions: TrainingSessionRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function appendTrainingSession(
  existing: TrainingSessionRecord[],
  record: TrainingSessionRecord
): TrainingSessionRecord[] {
  const next = [...existing, record];
  saveTrainingSessions(next);
  return next;
}

export function resetTrainingSessions(): TrainingSessionRecord[] {
  saveTrainingSessions([]);
  return [];
}

export function restoreSeedSessions(): TrainingSessionRecord[] {
  saveTrainingSessions(SEED_SESSIONS);
  return SEED_SESSIONS;
}
