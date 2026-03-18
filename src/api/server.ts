import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import path from "path";
import { appointmentRoutes } from "./routes/appointments";
import { scheduleRoutes } from "./routes/schedule";
import { barberRoutes } from "./routes/barbers";
import { authMiddleware } from "./middleware/auth";

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
  });

  // Health check (auth kerak emas)
  app.get("/health", async () => ({ ok: true }));

  // API routelarga auth middleware
  app.addHook("preHandler", authMiddleware);

  await app.register(appointmentRoutes, { prefix: "/api" });
  await app.register(scheduleRoutes, { prefix: "/api" });
  await app.register(barberRoutes, { prefix: "/api" });

  return app;
}
