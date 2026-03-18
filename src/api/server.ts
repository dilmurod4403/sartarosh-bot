import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import path from "path";
import { appointmentRoutes } from "./routes/appointments";
import { scheduleRoutes } from "./routes/schedule";
import { barberRoutes } from "./routes/barbers";
import { salonRoutes } from "./routes/salons";
import { authMiddleware } from "./middleware/auth";
import logger from "../utils/logger";
import { sendAdminAlert } from "../services/adminNotifier";

export async function createServer() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "x-telegram-init-data"],
  });

  // Static webapp fayllar
  const publicDir = path.join(process.cwd(), "public");
  await app.register(staticFiles, {
    root: publicDir,
    prefix: "/",
    decorateReply: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  });

  // Global error handler
  app.setErrorHandler(async (err, request, reply) => {
    const fastifyError = err as { statusCode?: number; message: string; stack?: string };
    const statusCode = fastifyError.statusCode ?? 500;
    const context: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      statusCode,
    };

    if (statusCode >= 500) {
      logger.error({ context, error: fastifyError.message, stack: fastifyError.stack }, "API server error");
      const error = err instanceof Error ? err : new Error(fastifyError.message);
      await sendAdminAlert("API server 500 xatosi", error, context);
      await reply.status(statusCode).send({ error: "Internal Server Error" });
    } else {
      logger.warn({ context, error: fastifyError.message }, "API client error");
      await reply.status(statusCode).send({ error: fastifyError.message });
    }
  });

  // Health check (auth kerak emas)
  app.get("/health", async () => ({ ok: true }));

  // API routelarga auth middleware
  app.addHook("preHandler", authMiddleware);

  await app.register(appointmentRoutes, { prefix: "/api" });
  await app.register(scheduleRoutes, { prefix: "/api" });
  await app.register(barberRoutes, { prefix: "/api" });
  await app.register(salonRoutes, { prefix: "/api" });

  return app;
}
