import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  base: undefined, // avoid pid/hostname noise; keep logs concise
  timestamp: pino.stdTimeFunctions.isoTime,
});
