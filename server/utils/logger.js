import winston from 'winston';
import colors from 'colors';

colors.enable();

const { NODE_ENV } = process.env;
const ENV = NODE_ENV || 'development';
const LOG_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';
const METHOD_REGEX = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;
const DURATION_STATUS_REGEX = /(\s)(\d{3})(?=\s+\d+(?:\.\d+)?\s+ms\b)/g;
const DASH_STATUS_REGEX = /(\s-\s)(\d{3})(\b)/g;
const SPLAT = Symbol.for('splat');

const LEVEL_COLORS = {
  INFO: colors.blue,
  ERROR: colors.red,
  WARN: colors.yellow,
  DEBUG: colors.gray,
};

const METHOD_COLORS = {
  GET: colors.green,
  POST: colors.blue,
  PUT: colors.yellow,
  PATCH: colors.magenta,
  DELETE: colors.red,
  OPTIONS: colors.cyan,
  HEAD: colors.gray,
};

const getTimestamp = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

const colorizeFromMap = (map, value) => {
  const upperValue = String(value).toUpperCase();
  const color = map[upperValue];
  return color ? color(upperValue) : upperValue;
};

const formatPrefix = (timestamp, level) => `[${colors.gray(timestamp)} | ${colorizeFromMap(LEVEL_COLORS, level)}]`;

const colorizeStatusCode = (statusCode) => {
  const code = Number(statusCode);
  if (code >= 500) return colors.red(String(statusCode));
  if (code >= 400) return colors.yellow(String(statusCode));
  if (code >= 300) return colors.cyan(String(statusCode));
  if (code >= 200) return colors.green(String(statusCode));
  return String(statusCode);
};

const formatExtraArg = (value) => {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const colorizeHttpMessage = (message) => {
  if (typeof message !== 'string') return String(message);

  const withMethod = message.replace(METHOD_REGEX, (method) => colorizeFromMap(METHOD_COLORS, method));
  const withDurationStatus = withMethod.replace(
    DURATION_STATUS_REGEX,
    (_, leadingSpace, statusCode) => `${leadingSpace}${colorizeStatusCode(statusCode)}`
  );
  return withDurationStatus.replace(
    DASH_STATUS_REGEX,
    (_, prefix, statusCode, suffix) => `${prefix}${colorizeStatusCode(statusCode)}${suffix}`
  );
};

const formatLogLine = ({ timestamp, level, message, stack, [SPLAT]: extraArgs = [] }) => {
  const combinedMessage = [message, ...extraArgs].map(formatExtraArg).filter(Boolean).join(' ');
  const prefix = formatPrefix(timestamp, level);
  const formattedMessage = colorizeHttpMessage(combinedMessage);

  if (stack) {
    return `${prefix} ${formattedMessage}\n${colors.red(stack)}`;
  }

  return `${prefix} ${formattedMessage}`;
};

const createFileTransport = (filename, level = 'info') => (
  new winston.transports.File({
    filename,
    level,
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp({ format: LOG_TIMESTAMP_FORMAT }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  })
);

let logger;

try {
  logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp({ format: LOG_TIMESTAMP_FORMAT }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: {
      application: `task-management-api-${ENV}`,
      environment: ENV,
    },
    transports: [
      new winston.transports.Console({
        level: 'info',
        handleExceptions: true,
        format: winston.format.combine(
          winston.format.timestamp({ format: LOG_TIMESTAMP_FORMAT }),
          winston.format.splat(),
          winston.format.printf(formatLogLine)
        ),
      }),
      ...(NODE_ENV === 'production'
        ? [createFileTransport('logs/app.log'), createFileTransport('logs/error.log', 'error')]
        : [])
    ],
    exitOnError: false,
  });

  logger.stream = {
    write: (message) => logger.info(message.trim()),
  };
} catch (error) {
  const render = (level, ...args) => {
    const content = args.map(formatExtraArg).filter(Boolean).join(' ');
    return `${formatPrefix(getTimestamp(), level)} ${colorizeHttpMessage(content)}`;
  };

  console.error(render('ERROR', 'Logger initialization failed:', error));

  logger = {
    info: (...args) => console.log(render('INFO', ...args)),
    error: (...args) => console.error(render('ERROR', ...args)),
    warn: (...args) => console.warn(render('WARN', ...args)),
    debug: (...args) => console.log(render('DEBUG', ...args)),
    stream: {
      write: (message) => console.log(render('INFO', message.trim())),
    },
  };

}

export { logger };
