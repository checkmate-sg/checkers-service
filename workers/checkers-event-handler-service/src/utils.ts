import { DAYS_MS } from "./constants";
import type { CheckerAPI } from "./types";

/**
 * Get the reference date for inactivity calculation.
 * Uses the most recent of: lastVotedTimestamp, onboardingTime, lastActivatedDate
 */
export function getLastActiveDate(checker: CheckerAPI): Date | null {
  const dates = [checker.lastVotedTimestamp, checker.onboardingTime, checker.lastActivatedDate]
    .filter((d): d is Date => d !== null)
    .map(d => new Date(d));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Calculate days since a given date
 */
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / DAYS_MS);
}
