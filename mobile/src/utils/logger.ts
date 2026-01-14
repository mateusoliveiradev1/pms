
type LogLevel = 'info' | 'warn' | 'error';

const isDev = __DEV__;

const formatMessage = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return { prefix, message, data };
};

export const Logger = {
  info: (message: string, data?: any) => {
    if (isDev) {
      const { prefix } = formatMessage('info', message, data);
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  },

  warn: (message: string, data?: any) => {
    if (isDev) {
      const { prefix } = formatMessage('warn', message, data);
      if (data) {
        console.warn(prefix, message, data);
      } else {
        console.warn(prefix, message);
      }
    }
  },

  error: (message: string, error?: any) => {
    // Errors might be important to log to a crash reporting service in production (e.g. Sentry)
    // For now, we only log to console in DEV, but this is the place to hook up Sentry later.
    if (isDev) {
      const { prefix } = formatMessage('error', message, error);
      if (error) {
        console.error(prefix, message, error);
      } else {
        console.error(prefix, message);
      }
    }
  }
};
