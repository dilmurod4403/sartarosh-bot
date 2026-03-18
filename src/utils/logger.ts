import pino from "pino";
import path from "path";
import fs from "fs";

// logs/ papkasi mavjud bo'lmasa yaratish
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDev = process.env.NODE_ENV !== "production";

const targets: pino.TransportTargetOptions[] = [
  // error.log — faqat error darajasi
  {
    target: "pino/file",
    level: "error",
    options: {
      destination: path.join(logsDir, "error.log"),
      mkdir: true,
    },
  },
  // combined.log — barcha darajalar
  {
    target: "pino/file",
    level: "debug",
    options: {
      destination: path.join(logsDir, "combined.log"),
      mkdir: true,
    },
  },
];

if (isDev) {
  targets.push({
    target: "pino-pretty",
    level: "debug",
    options: {
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  });
}

const transport = pino.transport({ targets });

const logger = pino(
  {
    level: "debug",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  transport
);

export default logger;
