const { createLogger, format, transports, addColors } = require('winston');

// Define colors for each level
addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
});

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),                // Colorize output per level
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
  ),
  transports: [new transports.Console()]
});

module.exports = logger;
