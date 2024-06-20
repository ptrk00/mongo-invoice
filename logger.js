const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

// Define the custom log format
const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create the logger instance
const logger = winston.createLogger({
  level: 'info', // Set the default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add a timestamp
    colorize(), // Enable colors
    customFormat // Use the custom format
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    new winston.transports.File({ filename: 'app.log' }) // Log to a file
  ]
});

module.exports = logger;