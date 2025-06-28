// library-management-system/src/app/lib/logger.ts
import winston from 'winston';

// Define log levels and colors for console output
const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logger = winston.createLogger({
  levels: customLevels,
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug', // Use 'debug' in development, 'error' in production
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Human-readable timestamp
    winston.format.errors({ stack: true }), // Include stack traces for errors
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports: [
    // Log errors to a file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // Log all levels (info, warn, error) to a combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
    }),
    // Log to console in development with colors
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// If an error occurs, ensure it logs with stack trace
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Export the logger
export default logger;