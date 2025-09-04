// library-management-system/src/app/lib/logger.ts
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels and colors for console output
const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Custom format for file logging (JSON for better parsing in frontend)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json() // JSON format for easier parsing in frontend
);

// Custom format for console logging (human readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}${metaStr}`;
  })
);

const logger = winston.createLogger({
  levels: customLevels,
  level: 'debug', // 🔥 Fixed: Same level for both
  defaultMeta: {
    service: 'library-management',
    environment: 'production' // 🔥 Fixed: Static environment
  },
  transports: [
    // Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Info logs (info, warn, error)
    new winston.transports.File({
      filename: path.join(logsDir, 'info.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs (all levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Console logging
    new winston.transports.Console({
      level: 'debug', // 🔥 Fixed: Same level for both
      format: consoleFormat,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 3,
    }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 3,
    }),
  ],
});

// Custom logging methods for better categorization
const customLogger = {
  // Basic logging methods
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Specific use-case methods
  apiRequest: (method: string, url: string, statusCode?: number, meta?: any) => {
    logger.info(`API ${method} ${url}${statusCode ? ` - ${statusCode}` : ''}`, {
      type: 'api_request',
      method,
      url,
      statusCode,
      ...meta
    });
  },
  
  apiError: (method: string, url: string, error: any, meta?: any) => {
    logger.error(`API ${method} ${url} - Error: ${error.message}`, {
      type: 'api_error',
      method,
      url,
      error: error.message,
      stack: error.stack,
      ...meta
    });
  },
  
  dbQuery: (query: string, duration?: number, meta?: any) => {
    logger.debug(`DB Query: ${query}${duration ? ` (${duration}ms)` : ''}`, {
      type: 'db_query',
      query,
      duration,
      ...meta
    });
  },
  
  userAction: (userId: string, action: string, meta?: any) => {
    logger.info(`User ${userId} performed: ${action}`, {
      type: 'user_action',
      userId,
      action,
      ...meta
    });
  },
  
  fileOperation: (operation: string, filename: string, success: boolean, meta?: any) => {
    const level = success ? 'info' : 'error';
    logger[level](`File ${operation}: ${filename} - ${success ? 'Success' : 'Failed'}`, {
      type: 'file_operation',
      operation,
      filename,
      success,
      ...meta
    });
  }
};

// Handle logger errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

export default customLogger;
