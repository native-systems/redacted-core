export interface Logger {
  debug (message: string): void
  info (message: string): void
  warn (message: string): void
  error (message:string): void
}

const loggers = process.env.NODE_ENV !== "production"
  ? new Set<Logger>([console])
  : new Set<Logger>()

export const attachLogger = (logger: Logger) => loggers.add(logger)

export const detachLogger = (logger: Logger) => loggers.delete(logger)

const logDispatcher = 
  (level: keyof Logger)=>
    (message: string) =>
      loggers.forEach((logger) => logger[level](message))

export const debug = logDispatcher("debug")

export const info = logDispatcher("info")

export const warn = logDispatcher("warn")

export const error = logDispatcher("error")
