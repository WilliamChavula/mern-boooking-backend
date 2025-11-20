import winston from "winston";
import { config } from "../config";

const isDevelopment = config.NODE_ENV === "development";

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ["message", "level", "timestamp", "label"],
  }),
  isDevelopment
    ? winston.format.printf(({ timestamp, level, message, metadata }) => {
        const meta = metadata as Record<string, any>;
        const metaString =
          Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : "";
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
      })
    : winston.format.json(),
);

const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  format: customFormat,
  defaultMeta: { service: "hotel-booking-api" },
  transports: [
    new winston.transports.Console({
      format: isDevelopment
        ? winston.format.combine(winston.format.colorize(), customFormat)
        : customFormat,
    }),
  ],
});

if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );
}

export { logger };
