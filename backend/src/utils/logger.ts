/**
 * Zero-dependency leveled logger (M-02).
 *
 * Replaces raw `console.log` calls scattered across the backend with a small
 * leveled wrapper so production logs can be filtered and alerted on.
 *
 * Level semantics (higher = more severe):
 *  - debug: verbose internals (request details, cache hits)
 *  - info:  normal operational events (module actions, boot/shutdown)
 *  - warn:  recoverable anomalies (fallback paths, missing cache entries)
 *  - error: failures that need attention
 *
 * Rules:
 *  - Never log raw passwords, tokens, GSTINs or full request bodies.
 *  - Prefer `logger.info`/`logger.warn` over `console.log` for new code.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Set a floor via LOG_LEVEL (default: info) so debug noise is cheap to keep off in prod.
const configuredLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) || 'info';

function emit(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[configuredLevel]) return;

  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;

  // eslint-disable-next-line no-console
  const sink =
    level === 'error' ? console.error :
    level === 'warn' ? console.warn :
    level === 'debug' ? console.debug :
    console.log;

  if (args.length > 0) {
    sink(prefix, message, ...args);
  } else {
    sink(prefix, message);
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => emit('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => emit('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => emit('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => emit('error', message, ...args),
};