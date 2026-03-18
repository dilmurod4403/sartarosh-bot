import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import prisma from "../../utils/prisma";

declare module "fastify" {
  interface FastifyRequest {
    telegramUser: {
      id: number;
      first_name: string;
      username?: string;
    };
    dbUser: {
      id: number;
      telegramId: string;
      name: string;
      salonUsers: { role: string; salonId: number }[];
    };
  }
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return expectedHash === hash;
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  // Health check
  if (req.url === "/health") return;

  const initData = req.headers["x-telegram-init-data"] as string;

  const botToken = process.env.BOT_TOKEN!;

  // Development rejimida initData bo'sh bo'lsa, admin user ishlatiladi
  if (!initData && process.env.NODE_ENV === "development") {
    const devUser = await prisma.user.findFirst({
      where: { telegramId: "752634550" },
      include: { salonUsers: true },
    });
    if (!devUser) return reply.status(401).send({ error: "Dev user not found" });
    req.telegramUser = { id: 752634550, first_name: devUser.name };
    req.dbUser = devUser as any;
    return;
  }

  if (!initData) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Development rejimida validatsiyani o'tkazib yuborish mumkin
  if (process.env.NODE_ENV !== "development") {
    const isValid = validateTelegramInitData(initData, botToken);
    if (!isValid) {
      return reply.status(401).send({ error: "Invalid init data" });
    }
  }

  // User ma'lumotlarini olish
  const params = new URLSearchParams(initData);
  const userJson = params.get("user");
  if (!userJson) return reply.status(401).send({ error: "No user data" });

  const telegramUser = JSON.parse(userJson);
  req.telegramUser = telegramUser;

  const dbUser = await prisma.user.findUnique({
    where: { telegramId: String(telegramUser.id) },
    include: { salonUsers: true },
  });

  if (!dbUser) {
    return reply.status(401).send({ error: "User not found" });
  }

  req.dbUser = dbUser as any;
}
