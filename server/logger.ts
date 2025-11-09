type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component?: string;
  message: string;
  [key: string]: any;
}

class Logger {
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private log(level: LogLevel, component: string | undefined, message: string, data?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
    };

    if (component) {
      entry.component = component;
    }

    const output = JSON.stringify(entry);
    
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, data?: Record<string, any>, component?: string) {
    this.log('debug', component, message, data);
  }

  info(message: string, data?: Record<string, any>, component?: string) {
    this.log('info', component, message, data);
  }

  warn(message: string, data?: Record<string, any>, component?: string) {
    this.log('warn', component, message, data);
  }

  error(message: string, data?: Record<string, any>, component?: string) {
    this.log('error', component, message, data);
  }

  http(method: string, path: string, statusCode: number, durationMs: number, metadata?: Record<string, any>) {
    this.log('info', 'http', `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      durationMs,
      ...metadata,
    });
  }

  business(event: string, data?: Record<string, any>, component?: string) {
    this.log('info', component || 'business', event, {
      eventType: 'business',
      ...data,
    });
  }
}

export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? 'debug' : 'info'
);
