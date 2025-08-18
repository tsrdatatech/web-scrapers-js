import pino from 'pino'
import { CrawleePino } from 'crawlee-pino'
import { Log } from 'crawlee'

export const basePino = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

// Crawlee Log instance using crawlee-pino adapter
export const crawleeLog = new Log({
  logger: new CrawleePino({ pino: basePino.child({ tag: 'crawlee' }) }),
})

// Keep previous named export for existing imports
export const pinoLogger = basePino
