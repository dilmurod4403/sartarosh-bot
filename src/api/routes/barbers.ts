import { FastifyInstance } from "fastify";
import prisma from "../../utils/prisma";
import { Role } from "../../generated/prisma";

export async function barberRoutes(app: FastifyInstance) {
  // Sartaroshlar ro'yxati (admin uchun)
  app.get("/barbers", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;

    if (role !== Role.ADMIN) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const { salonId: querySalonId } = req.query as { salonId?: string };
    const salonId = querySalonId ? parseInt(querySalonId) : user.salonUsers[0]?.salonId;

    const barbers = await prisma.barber.findMany({
      where: { salonId },
      include: {
        user: { select: { id: true, name: true, phone: true, telegramId: true } },
        schedules: true,
      },
    });

    return barbers;
  });

  // Sartarosh qo'shish
  app.post("/barbers", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;
    if (role !== Role.ADMIN) return reply.status(403).send({ error: "Forbidden" });

    const { telegramId, name, slotDuration, salonId: bodyId } = req.body as {
      telegramId: string;
      name?: string;
      slotDuration?: number;
      salonId?: number;
    };

    // Admin o'sha salonni boshqarishiga tekshir
    const salonId = bodyId ?? user.salonUsers[0]?.salonId;
    const isAdmin = user.salonUsers.some((su) => su.salonId === salonId && su.role === "ADMIN");
    if (!isAdmin) return reply.status(403).send({ error: "Bu salonga ruxsat yo'q" });

    if (!telegramId) return reply.status(400).send({ error: "telegramId required" });

    const barberUser = await prisma.user.upsert({
      where: { telegramId },
      update: name ? { name } : {},
      create: { telegramId, name: name ?? "Sartarosh", language: "UZ" },
    });

    await prisma.salonUser.upsert({
      where: { userId_salonId: { userId: barberUser.id, salonId } },
      update: { role: "BARBER" },
      create: { userId: barberUser.id, salonId, role: "BARBER" },
    });

    const barber = await prisma.barber.upsert({
      where: { userId: barberUser.id },
      update: { salonId, isActive: true },
      create: { userId: barberUser.id, salonId, slotDuration: slotDuration ?? 30 },
    });

    const workDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    for (const day of workDays) {
      await prisma.barberSchedule.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: day as any } },
        update: {},
        create: { barberId: barber.id, dayOfWeek: day as any, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00", isDayOff: false },
      });
    }
    await prisma.barberSchedule.upsert({
      where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: "SUNDAY" } },
      update: { isDayOff: true },
      create: { barberId: barber.id, dayOfWeek: "SUNDAY", startTime: "09:00", endTime: "18:00", isDayOff: true },
    });

    return { ...barber, user: { name: barberUser.name, telegramId: barberUser.telegramId } };
  });

  // Sartaroshni faollashtirish/o'chirish
  app.patch("/barbers/:id", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;

    if (role !== Role.ADMIN) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive: boolean };

    const barber = await prisma.barber.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    return barber;
  });

  // Salon ma'lumotlari
  app.get("/salon", async (req, reply) => {
    const user = req.dbUser;
    const salonId = user.salonUsers[0]?.salonId;
    if (!salonId) return reply.status(404).send({ error: "Not found" });

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    return salon;
  });

  // Foydalanuvchi roli
  app.get("/me", async (req, reply) => {
    const user = req.dbUser;
    const salonUser = user.salonUsers[0];
    return {
      id: user.id,
      name: user.name,
      telegramId: user.telegramId,
      role: salonUser?.role ?? "CLIENT",
      salonId: salonUser?.salonId,
    };
  });
}
