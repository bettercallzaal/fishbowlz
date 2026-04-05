/** Minimal logger stub for standalone FISHBOWLZ */
export const logger = {
  info: (...args: unknown[]) => console.log('[FISHBOWLZ]', ...args),
  error: (...args: unknown[]) => console.error('[FISHBOWLZ]', ...args),
  warn: (...args: unknown[]) => console.warn('[FISHBOWLZ]', ...args),
};
