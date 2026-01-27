/**
 * Centralized parameters helper for reading from KV with fallbacks.
 * All parameters are stored in CHECKMATE_CHECKERS_PARAMETERS_KV.
 */

// KVNamespace interface for type safety (matches Cloudflare Workers KV)
interface KVNamespace {
  get(key: string): Promise<string | null>;
}

// Production defaults (fallback values)
export const PARAMETER_DEFAULTS = {
  // Lifecycle thresholds
  INACTIVITY_WARNING_DAYS: 3,
  INACTIVITY_DEACTIVATION_DAYS: 10,
  PROGRAMME_EXTENSION_DAYS: 60,
  PROGRAMME_OFFBOARDING_DAYS: 90,

  // Reminder thresholds
  REMINDER_1_DAYS: 14,
  REMINDER_2_DAYS: 28,

  // Accuracy nudge thresholds
  ACCURACY_NUDGE_VOTE_THRESHOLD: 20,
  ACCURACY_NUDGE_THRESHOLD: 50,

  // Programme targets
  PROGRAMME_TARGET_VOTES: 50,
  PROGRAMME_TARGET_ACCURACY: 60,
  PROGRAMME_TARGET_REPORTS: 5,
} as const;

export type ParameterKey = keyof typeof PARAMETER_DEFAULTS;

/**
 * Get a parameter value from KV with fallback to default.
 * Caches values in memory for the duration of the request.
 */
export async function getParameter(kv: KVNamespace, key: ParameterKey): Promise<number> {
  try {
    const value = await kv.get(key);
    if (value !== null) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(`Failed to get parameter ${key} from KV:`, error);
  }

  return PARAMETER_DEFAULTS[key];
}

/**
 * Get multiple parameters at once.
 * More efficient than calling getParameter multiple times.
 */
export async function getParameters<K extends ParameterKey>(
  kv: KVNamespace,
  keys: K[]
): Promise<Record<K, number>> {
  const results = await Promise.all(
    keys.map(async key => [key, await getParameter(kv, key)] as const)
  );

  return Object.fromEntries(results) as Record<K, number>;
}
